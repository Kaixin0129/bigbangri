const fs = require("fs");
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function getAllHtmlFiles(dir) {
  let results = [];

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getAllHtmlFiles(fullPath));
    } else if (
      file.endsWith(".html") &&
      file !== "search.html"
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

function buildIndex() {
  let index = [];

  const pages = getAllHtmlFiles(__dirname);

  for (const filePath of pages) {

    const html = fs.readFileSync(filePath, "utf8");

    const dom = new JSDOM(html);

    const document = dom.window.document;

    document.querySelectorAll(
      'div[style*="text-align:center"], div[style*="text-align: center"]'
    ).forEach(div => {
      if (div.id && div.id.startsWith("block")) {
        div.removeAttribute("id");
      }
    });

    let pageCounter = 1;

    document.querySelectorAll(
      'div[style*="text-align:center"], div[style*="text-align: center"]'
    ).forEach(div => {

      const firstP = div.querySelector("p");

      let titleText = "";

      if (firstP) {
        titleText = firstP.textContent.trim();
      } else {

        const clone = div.cloneNode(true);

        clone.querySelectorAll(
          ".nav-button, .slide-counter"
        ).forEach(el => el.remove());

        titleText = clone.textContent
          .replace(/←/g, "")
          .replace(/→/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }

      if (!titleText) return;

      div.id = "block" + pageCounter;

      const relativePath = path
        .relative(__dirname, filePath)
        .replace(/\\/g, "/");

      index.push({
        title: relativePath.replace(".html", ""),
        url: "/collection/" + relativePath + "#" + div.id,
        html: `<p id="${div.id}">${titleText}</p>`,
        text: titleText
      });

      pageCounter++;
    });

    fs.writeFileSync(
      filePath,
      dom.serialize(),
      "utf8"
    );

    console.log(`✅ Processed ${path.relative(__dirname, filePath)}`);
  }

  fs.writeFileSync(
    path.join(__dirname, "search_index.json"),
    JSON.stringify(index, null, 2),
    "utf8"
  );

  console.log(
    `✅ Wrote collection/search_index.json with ${index.length} items`
  );
}

buildIndex();