// ==UserScript==
// @name         Archive ranobe
// @namespace    https://github.com/JumpJets/Archive-ranobelib-userscript
// @version      2024.04.21
// @description  Download ranobe from ranobelib.me as archived zip.
// @author       X4
// @match        https://ranobelib.me/*book/*
// @icon         https://icons.duckduckgo.com/ip2/ranobelib.me.ico
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @grant        none
// ==/UserScript==

(() => {
	"use strict";

	const create_element = (tag, attrs) => attrs ? Object.assign(document.createElement(tag), attrs) : document.createElement(tag);

	const delay = time => new Promise(resolve => setTimeout(resolve, time));

	const unix_timestamp = () => Math.floor(new Date().getTime() / 1_000)

	const fetch_json = async (url) => {
		try {
			const resp = await fetch(url, { method: "GET" });

			if (resp.status === 429) {
				console.warn([...resp.headers], resp.headers.has("X-Ratelimit-Reset"), +resp.headers.get("X-Ratelimit-Reset"))
				const reset_at = resp.headers.has("X-Ratelimit-Reset") ? +resp.headers.get("X-Ratelimit-Reset") : unix_timestamp() + 60,
					now = unix_timestamp(),
					dt = reset_at - now;

				console.warn(`Waiting ${dt} seconds for ratelimit reset for url: ${url}`)

				await delay(dt * 1_000);
				return await fetch_json(url);
			}
			if (!resp.ok) return;

			return await resp.json();
		} catch (e) {
			console.error(`Fetch error: ${url}\n`, e);
		}
	};

	const fetch_blob = async (url) => {
		try {
			const resp = await fetch(url, { method: "GET" });

			if (!resp.ok) return;

			return await resp.blob(); // URL.createObjectURL(blob);
		} catch (e) {
			console.error(`Fetch error: ${url}\n`, e);
		}
	};

	const fetch_chapters = async (ranobe_id) => (await fetch_json(`https://api.lib.social/api/manga/${ranobe_id}/chapters`))?.data;

	const fetch_chapter = async (ranobe_id, volume, number) => (await fetch_json(`https://api.lib.social/api/manga/${ranobe_id}/chapter?number=${number}&volume=${volume}`))?.data;

	const fetch_ranobe_data = async (slug) => (await fetch_json(`https://api.lib.social/api/manga/${slug}?fields[]=background&fields[]=eng_name&fields[]=otherNames&fields[]=summary&fields[]=releaseDate&fields[]=type_id&fields[]=caution&fields[]=views&fields[]=close_view&fields[]=rate_avg&fields[]=rate&fields[]=genres&fields[]=tags&fields[]=teams&fields[]=franchise&fields[]=authors&fields[]=publisher&fields[]=userRating&fields[]=moderated&fields[]=metadata&fields[]=metadata.count&fields[]=metadata.close_comments&fields[]=manga_status_id&fields[]=chap_count&fields[]=status_id&fields[]=artists&fields[]=format`))?.data;

	const dl_archive = async (e) => {
		function* zipiter(arr) {
			let i = 1;
			const amax = arr.length;

			if (amax === 0) return;
			else if (amax === 1) {
				yield [0, null, arr[0], null];
				return;
			}

			yield [0, null, arr[0], arr[1]];

			while (i <= amax - 2) {
				yield [i, arr[i - 1], arr[i], arr[i + 1]];
				++i;
			}

			yield [i, arr[i - 1], arr[i], null];
		}

		const html_template = (title, head, body, ch_p, ch_c, ch_n, ch_all) => `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${title}</title>
	<style>
		body {
			font-weight: 100;
			font-family: -webkit-pictograph;
			font-size: 18px;
			line-height: 1;
			text-align: center;
			word-break: break-word;
			margin: 0 auto;
			padding: 25px 5vw;
			background-color: hsl(223 9% 13% / 1);
			color: #dbdbdb;
			min-height: calc(100vh - 50px);
		}

		* {
			tab-size: 4 !important;
		}

		/* Firefox scrollbar, 8px */
		@supports (-moz-appearance:none) {
			* {
				scrollbar-width: thin;
			}
		}

		/* Chrome scrollbar */
		*::-webkit-scrollbar {
			/*width: 8px;
			height: 8px;*/
			width: 5px;
			height: 5px;
			background-color: transparent;
		}
		*::-webkit-scrollbar-thumb {
			background-color: #8888;
		}
		*::-webkit-scrollbar:hover {
			background-color: #8883;
		}

		h1 {
			line-height: 1.4;
			font-weight: 700;
			font-size: 24px;
		}

		p {
			margin-bottom: 12px;
			text-align: left;
		}

		a {
			display: block;
			user-select: none;
			color: inherit;
			text-decoration: none;
			border-radius: 10px;

			&:hover {
				background-color: #dbdbdb30;
			}

			&.prev {
				left: 5px;
			}

			&.next {
				right: 5px;
			}

			&.prev,
			&.next {
				position: fixed;
				bottom: 5px;
				width: 4vw;
				height: 30vh;
				font-size: 2vw;
				line-height: 30vh;
				border: 1px solid #dbdbdb;
				z-index: 5;
			}
		}

		nav {
			position: fixed;
			right: 0;
			/* top: 0; */
			bottom: 0;
			max-width: 520px;
			display: grid;
			padding: 10px 14px;
			gap: 2px;
			align-content: start;
			background-color: hsl(223 9.5% 22% / 0);
			text-align: left;
			font-weight: 500;
			font-size: 16px;
			max-height: 40px;
			overflow: hidden;
			z-index: 3;
			transition: .3s ease;

			&::before {
				content: "Оглавление";
				display: block;
				font-size: 20px;
				padding: 25px 15px 20px 15px;
				cursor: pointer;
				position: sticky;
				top: -10px;
			}

			&:focus-within {
				max-height: calc(100vh - 20px);
				overflow: auto;
				background-color: hsl(223 9.5% 22% / 1);
				z-index: 6;

				&::before {
					background-color: hsl(223 9.5% 22% / 1);
				}
			}

			> a {
				padding: 10px 14px;
			}

			> a:hover,
			> a.current {
				background-color: hsl(223 9.5% 13% / 0.3);
			}
		}
	</style>
</head>
<body>
${head}
${body}
<script>
	const create_element = (tag, attrs) => attrs ? Object.assign(document.createElement(tag), attrs) : document.createElement(tag);

	const chapters = ${JSON.stringify(ch_all)},
		  current = ${JSON.stringify(ch_c)},
		  nav = create_element("nav", { tabIndex: "0" }),
		  a_p = create_element("a", { classList: "prev", href: \`v${ch_p?.volume}_${ch_p?.number?.toLocaleString?.("en-US", { minimumIntegerDigits: 3, useGrouping: false })}.html\`, innerText: "←" }),
		  a_n = create_element("a", { classList: "next", href: \`v${ch_n?.volume}_${ch_n?.number?.toLocaleString?.("en-US", { minimumIntegerDigits: 3, useGrouping: false })}.html\`, innerText: "→" });

	if (${!!ch_p}) document.body.appendChild(a_p);
	if (${!!ch_n}) document.body.appendChild(a_n);

	for (let ch of chapters) {
		const cd = create_element("a", { innerText: \`Том \${ch.volume} Глава \${ch.number} - \${ch.name}\`, href: \`v\${ch.volume}_\${ch.number.toLocaleString("en-US", {minimumIntegerDigits: 3, useGrouping: false})}.html\` });

		if (ch.id === current.id) cd.classList.add("current");

		nav.appendChild(cd);
	}

	document.body.appendChild(nav);
</script>
</body>
</html>`;

		const get_attachment = (attachments, name) => {
			for (const attachment of attachments) {
				if (attachment.name === name) return attachment;
			}
		};

		const local_attachment = (attachments, name, chapter) => {
			const attachment = get_attachment(attachments, name);
			if (!attachment) return;

			return `../images/${chapter}/${attachment.filename}`;
		};

		const zip = new JSZip(),
			ranobe_id = +window.location.pathname.match(/(?<=book\/)\d+/)?.[0],
			slug = window.location.pathname.match(/(?<=book\/)[\w\-]+/)?.[0],
			ranobe_data = await fetch_ranobe_data(slug),
			title = ranobe_data?.rus_name || ranobe_data?.name,
			chapters = await fetch_chapters(ranobe_id),
			last = chapters.at(-1);

		for (let [i, prev, curr, next] of zipiter(chapters)) {
			console.log(`DL: volume ${curr.volume} chapter ${curr.number} / volume ${last.volume} chapter ${last.number}`);

			const chapter_tag = `v${curr.volume}_${curr.number.toLocaleString("en-US", { minimumIntegerDigits: 3, useGrouping: false })}`,
				chapter = await fetch_chapter(ranobe_id, curr.volume, curr.number) ?? { content: "", attachments: [] },
				attachments = chapter?.attachments?.map?.(a => ({ ...a, url: a?.url?.startsWith?.("/uploads/") ? `${window.location.origin}${a.url}` : `${window.location.origin}/uploads${a.url}` })) ?? [],
				content_type = typeof chapter.content === "string", // string / json
				html = (content_type
					? chapter.content.replace(/(<img (?:[\w"=]+\s)*src=")https:\/\/ranobelib\.me\/[^"]+\/([^\/"]+)("(?:[\w"=]+\s|\s)*\/?>)/g, `$1../images/${chapter_tag}/$2$3`)
					: chapter.content.content.map(o => (o.type === "paragraph"
						? `<p>${o?.content?.map?.(o2 => o2.text)?.join?.("<br />") ?? ""}</p>`
						: (o.type === "image" ? `<img alt="" src=${local_attachment(attachments, o?.attrs?.images?.[0]?.image, chapter_tag)} />` : `<p>${o?.text}</p>`)
					)).join("")),
				head = `<h1>Том ${curr.volume} Глава ${curr.number}${chapter.name ? " - " + chapter.name : ""}</h1>`;

			if (attachments?.length) {
				const images_folder = zip.folder("images").folder(chapter_tag)

				for (const attachment of attachments) {
					console.log(`DL image: ${attachment.url}`);

					const blob = await fetch_blob(attachment.url);
					if (blob) images_folder.file(attachment.filename, blob);
				}
			}

			zip.folder("chapters_html").file(
				`${chapter_tag}.html`,
				html_template(`${title} · Том ${curr.volume} Глава ${curr.number}` + (chapter.name ? ` · ${chapter.name}` : ""), head, html, prev, curr, next, chapters),
				{ compression: "DEFLATE", compressionOptions: { level: 9 } }
			);

			zip.folder("chapters_txt").file(
				`${chapter_tag}.txt`,
				`${title}\n\nТом ${curr.volume} Глава ${curr.number}${chapter.name ? " - " + chapter.name : ""}\n\n${[...new DOMParser().parseFromString(html, "text/html").body.children].map(c => c.tagName === "IMG" ? `[${c.src}]\n\n` : `${c.innerText.replace("\n", " ")}\n\n`).join("")}`,
				{ compression: "DEFLATE", compressionOptions: { level: 9 } }
			);

			// + 1 for /chapters + 1 for counting from 0
			if (i > 0 && (i + 2) % 100 === 0) await delay(60_000);
		}

		zip.generateAsync({ type: "base64" }).then((base64) => {
			const a = create_element("a", {
				href: "data:application/zip;base64," + base64,
				download: `${window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1)}.zip`,
			});
			a.click();
		});
	}

	const btn = create_element("div", {
		style: "width: 40px; height: 40px; cursor: pointer; position: fixed; right: 20px; bottom: 20px; background: #dbdbdb30; border: 1px solid #dbdbdb; border-radius: 14px; user-select: none; line-height: 30px; font-size: 20px; text-align: center; z-index: 10;",
		innerText: "📥",
	});

	document.body.appendChild(btn);

	btn.addEventListener("click", async (e) => { await dl_archive(e) });
})();
