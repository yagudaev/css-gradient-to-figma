import { assert, expect, test } from "vitest"
import { cssToFigmaGradient } from "./color"

test("cssToFigmaGradient(linear-gradient)", () => {
  expect(cssToFigmaGradient("linear-gradient(to left, red, blue)")).toMatchInlineSnapshot(`
    {
      "gradientStops": [
        {
          "color": {
            "a": 1,
            "b": 0,
            "g": 0,
            "r": 1,
          },
          "position": 0,
        },
        {
          "color": {
            "a": 1,
            "b": 1,
            "g": 0,
            "r": 0,
          },
          "position": 1,
        },
      ],
      "gradientTransform": [
        [
          -1,
          1.2246467991473532e-16,
          0.9999999999999999,
        ],
        [
          -1.2246467991473532e-16,
          -1,
          1,
        ],
      ],
      "type": "GRADIENT_LINEAR",
    }
  `)})