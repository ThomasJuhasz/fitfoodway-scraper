const {
  extractNutritions,
  extractComponents,
  markdownForDay,
} = require("./index");

describe("Application Tests", () => {
  it("should return true for a valid condition", () => {
    expect(true).toBe(true);
  });
});

describe("Nutrition Extraction", () => {
  it("extracts calories from Hungarian string", () => {
    const desc = "Kalória: 1445 kcal";
    expect(extractNutritions(desc).calories).toBe(1445);
  });
  it("extracts lipids (zsír) from Hungarian string", () => {
    const desc = "Zsír: 58 g";
    expect(extractNutritions(desc).lipids).toBe(58);
  });
  it("extracts carbohydrates (szénhidrát) from Hungarian string", () => {
    const desc = "Szénhidrát: 182 g";
    expect(extractNutritions(desc).carbohydrate).toBe(182);
  });
  it("extracts fiber (rost) from Hungarian string", () => {
    const desc = "Rost: 37 g";
    expect(extractNutritions(desc).fiber).toBe(37);
  });
  it("extracts sodium (nátrium) from Hungarian string", () => {
    const desc = "Nátrium: 4301 mg";
    expect(extractNutritions(desc).natrium).toBe(4301);
  });
  it("parses all nutrition values from a full description", () => {
    const desc =
      "Kalória: 1445 kcal, Zsír: 58 g, Szénhidrát: 182 g, Rost: 37 g, Nátrium: 4301 mg";
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
    const desc = "Kalória: 1000 kcal";
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
      "Hozzávalók: karfiol, burgonya, hagyma, olívaolaj, majonéz, só, bors, citromlé, padlizsán, paprika, paradicsom, telemea sajt, teljes kiőrlésű kenyér. Kalória 196 fehérje 3,9 g, szénhidrát 23,4 g, lipid 10,1 g, rost 4,8 g, nátrium 393 mg. Allergének: glutén, tej, tojás, mustár.";
    expect(extractNutritions(desc)).toEqual({
      calories: 196,
      protein: 3,
      lipids: 10,
      carbohydrate: 23,
      fiber: 4,
      natrium: 393,
    });
  });
});

describe("Component Extraction", () => {
  it("extracts components from a description string", () => {
    const desc =
      "Összetevők és táplálkozási adatok: - alma, körte, banán Súly: 200g";
    expect(extractComponents(desc)).toBe("alma, körte, banán");
  });
  it("returns empty string if no components section", () => {
    const desc = "Kalória: 1000 kcal";
    expect(extractComponents(desc)).toBe("");
  });
  it("extracts nutrition and components from Fritatta gombával és minisaláta description", () => {
    const desc =
      "Összetevők és tápértékre vonatkozó állítások: -Fritatta gombával és minisaláta: tojás, tej, só és bors, (salátakeverék, paradicsom, uborka, olajbogyó, kukorica, olaj olajbogyó, ecet, só, bors) Súly: 200g kalóriák: 255 kcal Fehérjék: 12 g, lipidek: 19 g, szénhidrát: 10 g, rostok: 3 g, nátrium: 2362 mg *A menük tartalmazhatnak mélyhűtött terméket/ mélyhűtött termékből készülhetnek. *Allergének: tojás, tejtermék,";

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

describe("Markdown Generation", () => {
  it("generates correct markdown for a day", () => {
    const day = {
      date: "23/04/2025",
      nutritions: {
        calories: 1445,
        lipids: 58,
        carbohydrate: 182,
        fiber: 37,
        natrium: 4301,
      },
      menu: [
        {
          name: "Sült kenyér kenhető tojással",
          nutritions: {
            calories: 270,
            lipids: 10,
            carbohydrate: 35,
            fiber: 11,
            natrium: 1320,
          },
        },
        {
          name: "Zellerkrémleves",
          nutritions: {
            calories: 324,
            lipids: 20,
            carbohydrate: 31,
            fiber: 3,
            natrium: 1332,
          },
        },
      ],
    };
    const md = markdownForDay(day);
    expect(md).toContain("# 23/04/2025");
    expect(md).toContain("Kalória: 1445 kcal");
    expect(md).toContain(
      "Sült kenyér kenhető tojással (270 kcal, 10g zsír, 35g szénhidrát, 11g rost, 1320mg nátrium)"
    );
    expect(md).toContain(
      "Zellerkrémleves (324 kcal, 20g zsír, 31g szénhidrát, 3g rost, 1332mg nátrium)"
    );
  });
});
