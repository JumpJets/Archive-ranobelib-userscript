// ==UserScript==
// @name         Archive ranobe
// @namespace    https://github.com/JumpJets/Archive-ranobelib-userscript
// @version      1.1
// @description  Download ranobe from ranobelib.me as archived zip.
// @author       X4
// @include      /^https?:\/\/ranobelib\.me\/[\w\-]+(?:\?.+|#.*)?$/
// @icon         https://icons.duckduckgo.com/ip2/ranobelib.me.ico
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.9.1/jszip.min.js
// @grant        none
// ==/UserScript==

(function() {
	"use strict";

	const dl_archive = async (e) => {
		const ftch = async (url) => { const resp = await fetch(url, {method: "GET"}); return await resp.text() };

		function* zipiter(arr) {
			let i = 1;
			const amax = arr.length;

			if (amax === 0) return;
			else if (amax === 1) {
				yield [null, arr[0], null];
				return;
			}

			yield [null, arr[0], arr[1]];

			while (i <= amax - 2) {
				yield [arr[i - 1], arr[i], arr[i + 1]];
				++i;
			}

			yield [arr[i - 1], arr[i], null];
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
			background-color: #434751;
			color: #dbdbdb;
			min-height: calc(100vh - 50px);
		}

		* {
			tab-size: 4 !important;
			scrollbar-width: thin; /* Firefox scrollbar 8px */
		}
		/* Chrome scrollbar */
		*::-webkit-scrollbar {
			width: 8px;
			height: 8px;
			background-color: transparent;
		}
		*::-webkit-scrollbar-thumb {
			background-color: #8888;
		}
		*::-webkit-scrollbar:hover {
			background-color: #8883;
		}

		div {
			line-height: 1.4;
			font-weight: 700;
			font-size: 24px;
		}
		div ~ div:last-of-type {
			margin-bottom: 40px;
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
		}
		a.prev, a.next {
			position: fixed;
			bottom: 5px;
			width: 4vw;
			height: 30vh;
			font-size: 2vw;
			line-height: 30vh;
			border: 1px solid #dbdbdb;
			z-index: 5;
		}
		a.prev {
			left: 5px;
		}
		a.next {
			right: 5px;
		}
		a:hover {
			background-color: #dbdbdb30;
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
			background-color: hsla(223, 9.5%, 22%, 0);
			text-align: left;
			font-weight: 500;
			font-size: 16px;
			max-height: 40px;
			overflow: hidden;
			z-index: 3;
			transition: .3s ease;
		}
		nav::before {
			content: "Оглавление";
			display: block;
			font-size: 20px;
			padding: 15px 15px 20px 15px;
			cursor: pointer;
		}
		nav:focus-within {
			max-height: calc(100vh - 20px);
			overflow: auto;
			background-color: hsla(223, 9.5%, 22%, 1);
			z-index: 6;
		}
		nav > a {
			padding: 10px 14px;
		}
		nav > a:hover, nav > a.current {
			background-color: hsla(223, 9.5%, 13%, 0.3);
		}
	</style>
</head>
<body>
${head}
${body}
<script>
	const chapters = ${JSON.stringify(ch_all)},
		  current = ${JSON.stringify(ch_c)},
		  nav = document.createElement("nav"),
		  a_p = document.createElement("a"),
		  a_n = document.createElement("a");

	a_p.href = \`v${ch_p?.chapter_volume}_${ch_p?.chapter_number?.toLocaleString?.("en-US", {minimumIntegerDigits: 3, useGrouping: false})}.html\`;
	a_n.href = \`v${ch_n?.chapter_volume}_${ch_n?.chapter_number?.toLocaleString?.("en-US", {minimumIntegerDigits: 3, useGrouping: false})}.html\`;

	a_p.classList.add("prev");
	a_n.classList.add("next");

	a_p.innerText = "←";
	a_n.innerText = "→";

	if (${!!ch_p}) document.body.appendChild(a_p);
	if (${!!ch_n}) document.body.appendChild(a_n);

	for (let ch of chapters) {
		const cd = document.createElement("a");
		cd.innerText = \`Том \${ch.chapter_volume} Глава \${ch.chapter_number} - \${ch.chapter_name}\`;
		cd.href = \`v\${ch.chapter_volume}_\${ch.chapter_number.toLocaleString("en-US", {minimumIntegerDigits: 3, useGrouping: false})}.html\`;

		if (ch.chapter_id === current.chapter_id) cd.classList.add("current");

		nav.appendChild(cd);
	}

	nav.setAttribute("tabindex", "0");

	document.body.appendChild(nav);
</script>
</body>
</html>`;

		const zip = new JSZip(),
			  chapters = window?.__DATA__?.chapters?.list?.reverse?.() ?? [],
			  last = chapters[chapters.length - 1];

		for (let [p, c, n] of zipiter(chapters)) {
			console.log(`DL volume ${c.chapter_volume} chapter ${c.chapter_number} of volume ${last.chapter_volume} chapter ${last.chapter_number}`);

			const url = `${window.location.origin}${window.location.pathname}/v${c.chapter_volume}/c${c.chapter_number}`,
				  [dom_head, dom_txt] = await ftch(url).then((text) => { const p = new DOMParser(), doc = p.parseFromString(text, "text/html"); return [doc.querySelector("a.reader-header-action"), doc.querySelector(".reader-container")]; });

			zip.folder("chapters_html").file(
				`v${c.chapter_volume}_${c.chapter_number.toLocaleString("en-US", {minimumIntegerDigits: 3, useGrouping: false})}.html`,
				html_template(`${dom_head.querySelector(".reader-header-action__text").innerText} - Том ${c.chapter_volume} Глава ${c.chapter_number}`, dom_head.innerHTML.trim(), dom_txt.innerHTML, p, c, n, chapters)
			);

			zip.folder("chapters_txt").file(
				`v${c.chapter_volume}_${c.chapter_number.toLocaleString("en-US", {minimumIntegerDigits: 3, useGrouping: false})}.txt`,
				`${dom_head.innerText.replace(/^\n/, "")}\n\n${Array.from(dom_txt.children).map(c => c.innerText + "\n").join("")}`
			);
		}

		zip.generateAsync({type: "base64"}).then((base64) => {
			const a = document.createElement("a");
			a.href = "data:application/zip;base64," + base64;
			a.download = `${window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1)}.zip`;
			a.click();
		});
	}

	const btn = document.createElement("div");
	btn.style.width = "40px";
	btn.style.height = "40px";
	btn.style.cursor = "pointer";
	btn.style.position = "fixed";
	btn.style.right = "20px";
	btn.style.bottom = "20px";
	btn.style.background = "#dbdbdb30";
	btn.style.border = "1px solid #dbdbdb";
	btn.style.borderRadius = "14px";
	btn.style.userSelect = "none";
	btn.style.lineHeight = "30px";
	btn.style.fontSize = "20px";
	btn.style.textAlign = "center";
	btn.innerText = "📥";

	document.body.appendChild(btn);

	btn.addEventListener("click", async (e) => { await dl_archive(e) });
})();
