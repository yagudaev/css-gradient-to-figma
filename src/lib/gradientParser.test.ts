import { assert, expect, test } from "vitest"
import { parseGradient } from "./gradientParser"

test("parseGradient(linear-gradient)", () => {
  expect(parseGradient("linear-gradient(180deg, red)")).toStrictEqual(
    parseGradient("linear-gradient(rgb(255, 0, 0))")
  )
  expect(parseGradient("linear-gradient(blue 0)")).toStrictEqual(
    parseGradient("linear-gradient(blue 0px)")
  )
  expect(parseGradient("linear-gradient(to left, red, blue)")).toMatchInlineSnapshot(`
    [
      {
        "colorStops": [
          {
            "rgba": {
              "a": 1,
              "b": 0,
              "g": 0,
              "r": 255,
            },
            "type": "color-stop",
          },
          {
            "rgba": {
              "a": 1,
              "b": 255,
              "g": 0,
              "r": 0,
            },
            "type": "color-stop",
          },
        ],
        "orientation": {
          "type": "directional",
          "value": "left",
        },
        "type": "linear-gradient",
      },
    ]
  `)
  expect(parseGradient("linear-gradient(0.25turn, #fff 10px, 50%, red)")).toMatchInlineSnapshot(`
    [
      {
        "colorStops": [
          {
            "position": {
              "unit": "px",
              "value": 10,
            },
            "rgba": {
              "a": 1,
              "b": 255,
              "g": 255,
              "r": 255,
            },
            "type": "color-stop",
          },
          {
            "hint": {
              "unit": "%",
              "value": 50,
            },
            "type": "color-hint",
          },
          {
            "rgba": {
              "a": 1,
              "b": 0,
              "g": 0,
              "r": 255,
            },
            "type": "color-stop",
          },
        ],
        "orientation": {
          "type": "angular",
          "value": 90,
        },
        "type": "linear-gradient",
      },
    ]
  `)
})

test("parseGradient(radial-gradient)", () => {
  expect(parseGradient("radial-gradient(5em circle at top left, yellow, blue)"))
    .toMatchInlineSnapshot(`
      [
        {
          "colorStops": [
            {
              "rgba": {
                "a": 1,
                "b": 0,
                "g": 255,
                "r": 255,
              },
              "type": "color-stop",
            },
            {
              "rgba": {
                "a": 1,
                "b": 255,
                "g": 0,
                "r": 0,
              },
              "type": "color-stop",
            },
          ],
          "endingShape": "circle",
          "position": "top left",
          "size": "farthest-corner",
          "type": "radial-gradient",
        },
      ]
    `)
  expect(
    [
      "ellipse farthest-corner",
      // 'ellipse cover',
      // 'circle cover',
      // 'center bottom, ellipse cover',
      "circle at 87.23px -58.3px",
      "farthest-side",
      "farthest-corner",
      "farthest-corner at 87.23px -58.3px"
    ].map((declaration) => {
      const [{ colorStops, ...rest }] = parseGradient(
        `radial-gradient(${declaration}, red, blue)`
      )
      return { DECL: declaration, ...rest }
    })
  ).toMatchInlineSnapshot(`
    [
      {
        "DECL": "ellipse farthest-corner",
        "endingShape": "ellipse",
        "position": "center",
        "size": "farthest-corner",
        "type": "radial-gradient",
      },
      {
        "DECL": "circle at 87.23px -58.3px",
        "endingShape": "circle",
        "position": "87.23px -58.3px",
        "size": "farthest-corner",
        "type": "radial-gradient",
      },
      {
        "DECL": "farthest-side",
        "endingShape": "ellipse",
        "position": "center",
        "size": "farthest-side",
        "type": "radial-gradient",
      },
      {
        "DECL": "farthest-corner",
        "endingShape": "ellipse",
        "position": "center",
        "size": "farthest-corner",
        "type": "radial-gradient",
      },
      {
        "DECL": "farthest-corner at 87.23px -58.3px",
        "endingShape": "ellipse",
        "position": "87.23px -58.3px",
        "size": "farthest-corner",
        "type": "radial-gradient",
      },
    ]
  `)
})
