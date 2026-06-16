document.querySelectorAll(
  'div[style*="text-align:center"], div[style*="text-align: center"]'
).forEach(div => {

  let titleText = "";

  const firstP = div.querySelector("p");

  if (firstP) {
    titleText = firstP.textContent.trim();
  } else {
    titleText = div.textContent.trim();
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