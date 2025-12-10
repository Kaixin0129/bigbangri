const fs = require("fs");
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const pages = [
  "2006july.html","2006aug.html","2006sept.html","2006oct.html","2006nov.html","2006dec.html",
  "2007jan.html","2007feb.html","2007mar.html","2007apr.html","2007may.html","2007junejuly.html","2007aug.html","2007sept.html","2007oct.html","2007nov.html","2007dec.html",
  "2008jan.html","2008feb.html","2008mar.html","2008apr.html","2008may.html","2008june.html","2008july.html","2008aug.html","2008sept.html","2008oct.html","2008nov.html","2008dec.html",
  "2009jan.html","2009feb.html","2009mar.html","2009apr.html","2009may.html","2009june.html","2009july.html","2009aug.html","2009sept.html","2009oct.html","2009nov.html","2009dec.html",
  "2010jan.html","2010feb.html","2010mar.html","2010apr.html","2010may.html","2010june.html","2010july.html","2010aug.html","2010sept.html","2010oct.html","2010nov.html","2010dec.html",
  "2011jan.html","2011feb.html","2011mar.html","2011apr.html","2011may.html","2011june.html","2011july.html","2011aug.html","2011sept.html","2011oct.html","2011nov.html","2011dec.html",
  "2012jan.html","2012feb.html","2012mar.html","2012apr.html","2012may.html","2012june.html","2012july.html","2012aug.html","2012sept.html","2012oct.html","2012nov.html","2012dec.html",
  "2013jan.html","2013feb.html","2013mar.html","2013apr.html","2013may.html","2013june.html","2013july.html","2013aug.html","2013sept.html","2013oct.html","2013nov.html","2013dec.html",
  "2014jan.html","2014feb.html","2014mar.html","2014apr.html","2014may.html","2014june.html","2014july.html","2014aug.html","2014sept.html","2014oct.html","2014nov.html","2014dec.html",
  "2015jan.html","2015feb.html","2015mar.html","2015apr.html","2015may.html","2015june.html","2015july.html","2015aug.html","2015sept.html","2015oct.html","2015nov.html","2015dec.html",
  "2016jan.html","2016feb.html","2016mar.html","2016apr.html","2016may.html","2016june.html","2016july.html","2016aug.html","2016sept.html","2016oct.html","2016nov.html","2016dec.html",
  "2017jan.html","2017feb.html","2017mar.html","2017apr.html","2017may.html","2017june.html","2017july.html","2017aug.html","2017sept.html","2017oct.html","2017nov.html","2017dec.html",
  "2018jan.html","2018feb.html","2018mar.html","2018apr.html","2018may.html","2018june.html","2018july.html","2018aug.html","2018sept.html","2018oct.html","2018nov.html","2018dec.html",
  "2019jan.html","2019feb.html","2019mar.html","2019apr.html","2019may.html","2019june.html","2019july.html","2019aug.html","2019sept.html","2019oct.html","2019nov.html","2019dec.html",
  "2020jan.html","2020feb.html","2020mar.html","2020apr.html","2020may.html","2020june.html","2020july.html","2020aug.html","2020sept.html","2020oct.html","2020nov.html","2020dec.html",
  "2021jan.html","2021feb.html","2021mar.html","2021apr.html","2021may.html","2021june.html","2021july.html","2021aug.html","2021sept.html","2021oct.html","2021nov.html","2021dec.html",
  "2022jan.html","2022feb.html","2022mar.html","2022apr.html","2022may.html","2022june.html","2022july.html","2022aug.html","2022sept.html","2022oct.html","2022nov.html","2022dec.html",
  "2023jan.html","2023feb.html","2023mar.html","2023apr.html","2023may.html","2023june.html","2023july.html","2023aug.html","2023sept.html","2023oct.html","2023nov.html","2023dec.html",
  "2024jan.html","2024feb.html","2024mar.html","2024apr.html","2024may.html","2024june.html","2024july.html","2024aug.html","2024sept.html","2024oct.html","2024nov.html","2024dec.html",
  "2025jan.html","2025feb.html","2025mar.html","2025apr.html","2025may.html","2025june.html","2025july.html","2025aug.html","2025sept.html","2025oct.html","2025nov.html","2025dec.html"
];

function buildIndex() {
  let index = [];

  for (const page of pages) {
    const filePath = path.join(__dirname, page);
    const html = fs.readFileSync(filePath, "utf8");
    const dom = new JSDOM(html);
    const document = dom.window.document;

    
    document.querySelectorAll(".content-wrap[id^='block']").forEach(cw => {
      cw.removeAttribute("id");
    });

    
    let pageCounter = 1;

    
    document.querySelectorAll(".text-container").forEach(tc => {
      tc.id = "block" + pageCounter;

      
      index.push({
        title: page.replace(".html", ""),
        url: "/" + page + "#" + tc.id,
        html: tc.outerHTML,
        text: tc.textContent.trim()
      });

      pageCounter++;
    });

    fs.writeFileSync(filePath, dom.serialize(), "utf8");
    console.log(`✅ Processed ${page}`);
  }

  fs.writeFileSync("search_index.json", JSON.stringify(index, null, 2), "utf8");
  console.log(`✅ Wrote search_index.json with ${index.length} items`);
}

buildIndex();