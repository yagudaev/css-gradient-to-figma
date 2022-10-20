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
        "gradientLine": {
          "type": "side-or-corner",
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
        "gradientLine": {
          "type": "angle",
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
          "size": [
            {
              "unit": "em",
              "value": 5,
            },
          ],
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
      const [{ colorStops, ...rest }] = parseGradient(`radial-gradient(${declaration}, red, blue)`)
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

test("parseGradient(conic-gradient)", () => {
  expect(parseGradient("conic-gradient(from 3.1416rad at 10% 50%, #e66465, #9198e5)"))
    .toMatchInlineSnapshot(`
    [
      {
        "angle": 180.0004209182994,
        "colorStops": [
          {
            "rgba": {
              "a": 1,
              "b": 101,
              "g": 100,
              "r": 230,
            },
            "type": "angular-color-stop",
          },
          {
            "rgba": {
              "a": 1,
              "b": 229,
              "g": 152,
              "r": 145,
            },
            "type": "angular-color-stop",
          },
        ],
        "position": "10% 50%",
        "type": "conic-gradient",
      },
    ]
  `)
  expect(
    parseGradient(
      "conic-gradient(red 0deg, orange 90deg, yellow 180deg, green 270deg, blue 360deg)"
    )
  ).toMatchInlineSnapshot(`
      [
        {
          "colorStops": [
            {
              "angle": {
                "unit": "deg",
                "value": 0,
              },
              "rgba": {
                "a": 1,
                "b": 0,
                "g": 0,
                "r": 255,
              },
              "type": "angular-color-stop",
            },
            {
              "angle": {
                "unit": "deg",
                "value": 90,
              },
              "rgba": {
                "a": 1,
                "b": 0,
                "g": 165,
                "r": 255,
              },
              "type": "angular-color-stop",
            },
            {
              "angle": {
                "unit": "deg",
                "value": 180,
              },
              "rgba": {
                "a": 1,
                "b": 0,
                "g": 255,
                "r": 255,
              },
              "type": "angular-color-stop",
            },
            {
              "angle": {
                "unit": "deg",
                "value": 270,
              },
              "rgba": {
                "a": 1,
                "b": 0,
                "g": 128,
                "r": 0,
              },
              "type": "angular-color-stop",
            },
            {
              "angle": {
                "unit": "deg",
                "value": 360,
              },
              "rgba": {
                "a": 1,
                "b": 255,
                "g": 0,
                "r": 0,
              },
              "type": "angular-color-stop",
            },
          ],
          "position": "center",
          "type": "conic-gradient",
        },
      ]
    `)
})
