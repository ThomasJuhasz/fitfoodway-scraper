const cheerio = require("cheerio");
const {
  extractNutritions,
  extractComponents,
  markdownForDay,
  parseDaysFromProgramTimeline,
} = require("./index");

describe("Application Tests", () => {
  it("should return true for a valid condition", () => {
    expect(true).toBe(true);
  });
});

describe("Nutrition Extraction", () => {
  it("extracts calories from Hungarian string", () => {
    const desc = "KalÃ³ria: 1445 kcal";
    expect(extractNutritions(desc).calories).toBe(1445);
  });
  it("extracts lipids (zsÃ­r) from Hungarian string", () => {
    const desc = "ZsÃ­r: 58 g";
    expect(extractNutritions(desc).lipids).toBe(58);
  });
  it("extracts carbohydrates (szÃ©nhidrÃ¡t) from Hungarian string", () => {
    const desc = "SzÃ©nhidrÃ¡t: 182 g";
    expect(extractNutritions(desc).carbohydrate).toBe(182);
  });
  it("extracts fiber (rost) from Hungarian string", () => {
    const desc = "Rost: 37 g";
    expect(extractNutritions(desc).fiber).toBe(37);
  });
  it("extracts sodium (nÃ¡trium) from Hungarian string", () => {
    const desc = "NÃ¡trium: 4301 mg";
    expect(extractNutritions(desc).natrium).toBe(4301);
  });
  it("parses all nutrition values from a full description", () => {
    const desc =
      "KalÃ³ria: 1445 kcal, ZsÃ­r: 58 g, SzÃ©nhidrÃ¡t: 182 g, Rost: 37 g, NÃ¡trium: 4301 mg";
    expect(extractNutritions(desc)).toEqual({
      calories: 1445,
      protein: null,
      lipids: 58,
      carbohydrate: 182,
      fiber: 37,
      natrium: 4301,
    });
  });
  it("handles missing nutrition values gracefully", () => {
    const desc = "KalÃ³ria: 1000 kcal";
    expect(extractNutritions(desc)).toEqual({
      calories: 1000,
      protein: null,
      lipids: null,
      carbohydrate: null,
      fiber: null,
      natrium: null,
    });
  });
  it("parses nutrition values from a scientific-style description", () => {
    const desc =
      "HozzÃ¡valÃ³k: karfiol, burgonya, hagyma, olÃ­vaolaj, majonÃ©z, sÃ³, bors, citromlÃ©, padlizsÃ¡n, paprika, paradicsom, telemea sajt, teljes kiÅ‘rlÃ©sÅ± kenyÃ©r. KalÃ³ria 196 fehÃ©rje 3,9 g, szÃ©nhidrÃ¡t 23,4 g, lipid 10,1 g, rost 4,8 g, nÃ¡trium 393 mg. AllergÃ©nek: glutÃ©n, tej, tojÃ¡s, mustÃ¡r.";
    expect(extractNutritions(desc)).toEqual({
      calories: 196,
      protein: 3.9,
      lipids: 10.1,
      carbohydrate: 23.4,
      fiber: 4.8,
      natrium: 393,
    });
  });
  it("parses modern energia (kJ/kcal) labels", () => {
    const desc =
      "EnergiaÃ©rtÃ©k (kJ/kcal): 1125,2 / 269,1 FehÃ©rjÃ©k (g): 28,3 ZsÃ­r (g): 8,7 SzÃ©nhidrÃ¡t (g): 19,5 Rost (g): 4,5 NÃ¡trium (mg): 1250";
    expect(extractNutritions(desc)).toEqual({
      calories: 269.1,
      protein: 28.3,
      lipids: 8.7,
      carbohydrate: 19.5,
      fiber: 4.5,
      natrium: 1250,
    });
  });
  it("converts salt in grams to sodium in milligrams when sodium is missing", () => {
    const desc = "KalÃ³ria: 440 kcal, FehÃ©rje (g): 30, ZsÃ­r (g): 10, SÃ³ (g): 2,4";
    expect(extractNutritions(desc)).toEqual({
      calories: 440,
      protein: 30,
      lipids: 10,
      carbohydrate: null,
      fiber: null,
      natrium: 943,
    });
  });
  it("prefers the large portion when two serving-size macro blocks are present", () => {
    const desc =
      "Összetevők és tápértéktáblázat: -Gnocchi di patate paradicsomszósszal, friss mozzarellával és bazsalikommal: gnocchi, paradicsom, fokhagyma, hagyma, só, bors, cukor, friss bazsalikom, mozzarella, parmezán. Súly: 350g/500g Kalória Tápérték 100g-onként Energiaérték (kJ/kcal): 705,8 / 172,1, Zsír (g): 7,1 ebből: Telített zsírsavak (g) 4,7, Szénhidrát (g): 15,6 ebből: Cukrok (g): 1,5, Fehérjék (g): 10,2, Só (g): 1,6 Tápérték adagonként (350,00g) Energiaérték (kJ/kcal): 2470,2 / 602,3, Zsír (g): 24,7 ebből: Telített zsírsavak (g) 16,5, Szénhidrát (g): 54,5 ebből: Cukrok (g): 5,2, Fehérjék (g): 35,7, Só (g): 5,6 Tápérték 100g-onként Energiaérték (kJ/kcal): 722 / 177,2, Zsír (g): 7,9 ebből: Telített zsírsavak (g) 5,4, Szénhidrát (g): 14,3 ebből: Cukrok (g): 1,4, Fehérjék (g): 10,8, Só (g): 1,4 Tápérték adatok egy adagra (500,00 g) Energiaérték (kJ/kcal): 3609,9 / 885,9, Zsír (g): 39,6 ebből: Telített zsírsavak (g): 26,8, Szénhidrát (g): 71,5 ebből: Cukrok (g): 6,9, Fehérjék (g): 53,8, Só (g): 7,2 Allergéneket tartalmaz Tartalmaz: Glutént, Tejet";
    expect(extractNutritions(desc)).toEqual({
      calories: 885.9,
      protein: 53.8,
      lipids: 39.6,
      carbohydrate: 71.5,
      fiber: null,
      natrium: 2830,
    });
  });
  it("uses the very last 'Tápérték adatok egy adagra' block when repeated", () => {
    const desc =
      "Tápérték adatok egy adagra (350,00 g) Energiaérték (kJ/kcal): 2470,2 / 602,3, Zsír (g): 24,7, Szénhidrát (g): 54,5, Fehérjék (g): 35,7, Só (g): 5,6 valami köztes szöveg Tápérték adatok egy adagra (500,00 g) Energiaérték (kJ/kcal): 3609,9 / 885,9, Zsír (g): 39,6, Szénhidrát (g): 71,5, Fehérjék (g): 53,8, Só (g): 7,2 Allergéneket tartalmaz";

    expect(extractNutritions(desc)).toEqual({
      calories: 885.9,
      protein: 53.8,
      lipids: 39.6,
      carbohydrate: 71.5,
      fiber: null,
      natrium: 2830,
    });
  });
});

describe("Component Extraction", () => {
  it("extracts components from a description string", () => {
    const desc =
      "Ã–sszetevÅ‘k Ã©s tÃ¡plÃ¡lkozÃ¡si adatok: - alma, kÃ¶rte, banÃ¡n SÃºly: 200g";
    expect(extractComponents(desc)).toBe("alma, kÃ¶rte, banÃ¡n");
  });
  it("returns empty string if no components section", () => {
    const desc = "KalÃ³ria: 1000 kcal";
    expect(extractComponents(desc)).toBe("");
  });
  it("extracts nutrition and components from Fritatta gombÃ¡val Ã©s minisalÃ¡ta description", () => {
    const desc =
      "Ã–sszetevÅ‘k Ã©s tÃ¡pÃ©rtÃ©kre vonatkozÃ³ Ã¡llÃ­tÃ¡sok: -Fritatta gombÃ¡val Ã©s minisalÃ¡ta: tojÃ¡s, tej, sÃ³ Ã©s bors, (salÃ¡takeverÃ©k, paradicsom, uborka, olajbogyÃ³, kukorica, olaj olajbogyÃ³, ecet, sÃ³, bors) SÃºly: 200g kalÃ³riÃ¡k: 255 kcal FehÃ©rjÃ©k: 12 g, lipidek: 19 g, szÃ©nhidrÃ¡t: 10 g, rostok: 3 g, nÃ¡trium: 2362 mg *A menÃ¼k tartalmazhatnak mÃ©lyhÅ±tÃ¶tt termÃ©ket/ mÃ©lyhÅ±tÃ¶tt termÃ©kbÅ‘l kÃ©szÃ¼lhetnek. *AllergÃ©nek: tojÃ¡s, tejtermÃ©k,";

    expect(extractNutritions(desc)).toEqual({
      calories: 255,
      protein: 12,
      lipids: 19,
      carbohydrate: 10,
      fiber: 3,
      natrium: 2362,
    });
  });
});

describe("Protein program timeline parsing", () => {
  it("parses days and menu items from timeline layout", () => {
    const html = `
      <h4>HÃ©tfÅ‘ 09/02/2026</h4>
      <a href="/etel/100">Reggeli</a>
      <a href="/etel/100">- TojÃ¡sos reggeli 300g/400g</a>
      <a href="/etel/100">Teljes tÃ pÃ¨rtÃ¨k megtekintÃ¨se</a>
      <a href="/etel/101">EbÃ©d</a>
      <a href="/etel/101">- Csirkemell barnarizzsel 350g/500g</a>
      <h4>Kedd 10/02/2026</h4>
      <a href="/etel/200">Desszert</a>
      <a href="/etel/200">- FehÃ©rje desszert 150g/200g</a>
    `;

    const $ = cheerio.load(html);
    const days = parseDaysFromProgramTimeline($);

    expect(days).toHaveLength(2);
    expect(days[0].date).toBe("09/02/2026");
    expect(days[0].menu).toEqual([
      {
        name: "TojÃ¡sos reggeli 300g/400g",
        link: "https://fitfoodway.hu/etel/100",
      },
      {
        name: "Csirkemell barnarizzsel 350g/500g",
        link: "https://fitfoodway.hu/etel/101",
      },
    ]);
    expect(days[1].menu[0].name).toBe("FehÃ©rje desszert 150g/200g");
  });

  it("keeps days with no menu items so the report can render a placeholder", () => {
    const html = `
      <h4>Szerda 11/02/2026</h4>
      <p>Ez a nap most nem elérhető.</p>
      <h4>Csütörtök 12/02/2026</h4>
      <a href="/etel/300">Ebéd</a>
      <a href="/etel/300">- Marhahús bulgurral 350g/500g</a>
    `;

    const $ = cheerio.load(html);
    const days = parseDaysFromProgramTimeline($);

    expect(days).toEqual([
      { date: "11/02/2026", menu: [] },
      {
        date: "12/02/2026",
        menu: [
          {
            name: "Marhahús bulgurral 350g/500g",
            link: "https://fitfoodway.hu/etel/300",
          },
        ],
      },
    ]);
  });
});

describe("Markdown rendering", () => {
  it("renders a placeholder instead of a table for empty days", async () => {
    const markdown = await markdownForDay({
      date: "11/02/2026",
      menu: [],
      nutritions: {
        calories: 0,
        protein: 0,
        lipids: 0,
        carbohydrate: 0,
        fiber: 0,
        natrium: 0,
      },
    });

    expect(markdown).toContain("# 11/02/2026");
    expect(markdown).toContain("Have fun :)");
    expect(markdown).not.toContain("| TÃ¡panyag");
  });
});
