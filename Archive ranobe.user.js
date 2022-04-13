// ==UserScript==
// @name         Archive ranobe
// @namespace    https://github.com/JumpJets/Archive-ranobelib-userscript
// @version      1.0
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

		const html_template = (title, head, body) => `<!DOCTYPE html>
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
			position: fixed;
			bottom: 5px;
			width: 4vw;
			height: 30vh;
			user-select: none;
			font-size: 2vw;
			line-height: 30vh;
			color: inherit;
			text-decoration: none;
			border-radius: 10px;
			border: 1px solid #dbdbdb;
		}
		a.prev {
			left: 5px;
		}
		a.next {
			right: 5px;
		}
		a:hover {
			background: #dbdbdb30;
		}
	</style>
</head>
<body>
${head}
${body}
<script>
	const a_p = document.createElement("a"),
		  a_n = document.createElement("a");

	const [v, c] = window.location.pathname.substr(window.location.pathname.lastIndexOf("/") + 1, window.location.pathname.lastIndexOf(".") - window.location.pathname.lastIndexOf("/") - 1).split("_");

	a_p.href = \`\${v}_\${(parseInt(c) - 1).toString().padStart(3, "0")}.html\`;
	a_n.href = \`\${v}_\${(parseInt(c) + 1).toString().padStart(3, "0")}.html\`;

	a_p.classList.add("prev");
	a_n.classList.add("next");

	a_p.innerText = "←";
	a_n.innerText = "→";

	if (parseInt(c) > 0) document.body.appendChild(a_p);
	document.body.appendChild(a_n);
</script>
</body>
</html>`;

		const zip = new JSZip();

		for (let c of window.__DATA__.chapters.list) {
			console.log(`DL volume ${c.chapter_volume} chapter ${c.chapter_number}`)

			const url = `${window.location.origin}${window.location.pathname}/v${c.chapter_volume}/c${c.chapter_number}`,
				  [dom_head, dom_txt] = await ftch(url).then((text) => { const p = new DOMParser(), doc = p.parseFromString(text, "text/html"); return [doc.querySelector("a.reader-header-action"), doc.querySelector(".reader-container")]; });
			zip.folder("chapters_html").file(`v${c.chapter_volume}_${c.chapter_number.toString().padStart(3, "0")}.html`, html_template(`${dom_head.querySelector(".reader-header-action__text").innerText} - Том ${c.chapter_volume} Глава ${c.chapter_number}`, dom_head.innerHTML.trim(), dom_txt.innerHTML));

			zip.folder("chapters_txt").file(`v${c.chapter_volume}_${c.chapter_number.toString().padStart(3, "0")}.txt`, `${dom_head.innerText.replace(/^\n/, "")}\n\n${Array.from(dom_txt.children).map(c => c.innerText + "\n").join("")}`);
		}

		zip.generateAsync({type: "base64"}).then((base64) => {
			const a = document.createElement("a");
			a.href="data:application/zip;base64," + base64;
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