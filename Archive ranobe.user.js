// ==UserScript==
// @name         Archive ranobe with Progress Notification
// @namespace    https://github.com/JumpJets/Archive-ranobelib-userscript
// @version      2024.04.21
// @description  Download ranobe from ranobelib.me as archived zip with top-right progress notification.
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
	const unix_timestamp = () => Math.floor(new Date().getTime() / 1_000);

	const create_notification = () => {
		const container = create_element("div", {
			id: "archive-progress",
			style: `
				position: fixed;
				top: 20px;
				right: 20px;
				background: #1e1e2f;
				color: #fff;
				padding: 15px 20px;
				border-radius: 10px;
				z-index: 9999;
				box-shadow: 0 0 10px rgba(0,0,0,0.3);
				font-family: sans-serif;
				font-size: 14px;
				transition: opacity 0.3s ease;
			`
		});
		container.innerText = "Initializing...";
		document.body.appendChild(container);
		return container;
	};

	const update_notification = (el, msg) => {
		el.innerText = msg;
	};

	const fetch_json = async (url) => {
		try {
			const resp = await fetch(url);
			if (resp.status === 429) {
				const reset_at = resp.headers.has("X-Ratelimit-Reset") ? +resp.headers.get("X-Ratelimit-Reset") : unix_timestamp() + 60;
				await delay((reset_at - unix_timestamp()) * 1000);
				return await fetch_json(url);
			}
			if (!resp.ok) return;
			return await resp.json();
		} catch (e) {
			console.error(`Fetch error: ${url}`, e);
		}
	};

	const fetch_chapters = async (ranobe_id) => (await fetch_json(`https://api.cdnlibs.org/api/manga/${ranobe_id}/chapters`))?.data;
	const fetch_chapter = async (ranobe_id, volume, number) => (await fetch_json(`https://api.cdnlibs.org/api/manga/${ranobe_id}/chapter?number=${number}&volume=${volume}`))?.data;
	const fetch_ranobe_data = async (slug) => (await fetch_json(`https://api.cdnlibs.org/api/manga/${slug}`))?.data;

	const dl_archive = async () => {
		const zip = new JSZip();
		const ranobe_id = +window.location.pathname.match(/(?<=book\/)(\d+)/)[1];
		const slug = window.location.pathname.match(/book\/([\w\-]+)/)[1];
		const notify = create_notification();

		update_notification(notify, "Fetching ranobe metadata...");
		const ranobe_data = await fetch_ranobe_data(slug);
		const title = ranobe_data?.rus_name || ranobe_data?.name || slug;

		update_notification(notify, "Fetching chapters list...");
		const chapters = await fetch_chapters(ranobe_id);
		if (!chapters || chapters.length === 0) {
			update_notification(notify, "No chapters found.");
			return;
		}

		let idx = 0;
		for (const chapter of chapters) {
			idx++;
			const progress = `Downloading: Том ${chapter.volume}, Глава ${chapter.number} (${idx}/${chapters.length})`;
			update_notification(notify, progress);

			const chapter_data = await fetch_chapter(ranobe_id, chapter.volume, chapter.number);
			if (!chapter_data) continue;

			const name = `v${chapter.volume}_${chapter.number.toString().padStart(3, "0")}.html`;
			const html = `<!DOCTYPE html><html><body>${chapter_data.content || ""}</body></html>`;
			zip.file(name, html);
		}

		update_notification(notify, "Generating ZIP archive...");
		const blob = await zip.generateAsync({ type: "blob" });
		const link = create_element("a", {
			href: URL.createObjectURL(blob),
			download: `${title}.zip`
		});
		link.click();
		update_notification(notify, "Download complete!");
		setTimeout(() => notify.remove(), 5000);
	};

	// Optional button for triggering download manually
	const btn = create_element("button", {
		innerText: "📥 Archive Ranobe",
		style: `position:fixed;bottom:20px;right:20px;padding:10px 20px;background:#4caf50;color:white;border:none;border-radius:5px;z-index:9999;cursor:pointer;`
	});
	btn.addEventListener("click", dl_archive);
	document.body.appendChild(btn);
})();
