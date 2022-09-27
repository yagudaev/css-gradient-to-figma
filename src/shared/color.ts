import hexRgbLib, { RgbaObject as RGBALib } from "hex-rgb"
import rgbToHexLib from "rgb-hex"
import { parse as parseGradient, GradientNode } from "gradient-parser"
import { rotate, translate, compose } from "transformation-matrix"

export function hexToRgb(hex: string): RGB {
  console.log("trying to conver hex to rgb", { hex })
  const converted = hexRgbLib(hex) as RGBALib
  console.log("successfully converted hex to rgb", { converted })
  return { r: converted.red / 255.0, g: converted.green / 255.0, b: converted.blue / 255.0 }
}

export function hexToRgba(hex: string): RGBA {
  return { ...hexToRgb(hex), a: 1.0 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const converted = rgbToHexLib(r * 255, g * 255, b * 255)
  return `#${converted}`
}

export function rgbaToFigmaRgba([r, g, b, a]: [string, string, string, string?]): RGBA {
  return { r: Number(r) / 255.0, g: Number(g) / 255.0, b: Number(b) / 255.0, a: Number(a) || 1.0 }
}

export function cssToFigmaGradient(css: string): GradientPaint {
  console.log("trying to parse gradient", css)
  const parsedGradient = parseGradient(css.replace(/;$/, ""))[0]
  console.log("parsedGradient", parsedGradient)

  const rotationAngle = calculateRotationAngle(parsedGradient)
  const [tx, ty] = calculateTranslationToCenter(parsedGradient)
  const gradientTransform = compose(translate(0, 0.5), rotate(rotationAngle), translate(tx, ty))

  const figmaGradient: GradientPaint = {
    type: cssToFigmaGradientTypes(parsedGradient.type),
    gradientStops: parsedGradient.colorStops.map((stop, index) => ({
      position: index === 0 ? 0 : index / (parsedGradient.colorStops.length - 1),
      color:
        stop.type === "hex"
          ? hexToRgba(stop.value)
          : stop.type === "literal"
          ? hexToRgba("#000000")
          : rgbaToFigmaRgba(stop.value)
    })),
    gradientTransform: [
      [gradientTransform.a, gradientTransform.c, gradientTransform.e],
      [gradientTransform.b, gradientTransform.d, gradientTransform.f]
    ]
  }

  return figmaGradient
}

export function cssToFigmaGradientTypes(
  type: GradientNode["type"]
): "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" {
  switch (type) {
    case "linear-gradient":
      return "GRADIENT_LINEAR"
    case "radial-gradient":
      return "GRADIENT_RADIAL"
    case "repeating-linear-gradient":
      return "GRADIENT_LINEAR"
    case "repeating-radial-gradient":
      return "GRADIENT_RADIAL"
    default:
      throw "unsupported gradient type"
  }
}

function calculateRotationAngle(parsedGradient: GradientNode): number {
  // CSS has a top-down default, figma has a right-left default when no angle is specified
  const initialRotation = -Math.PI / 2.0
  let additionalRotation = 0.0

  // linear gradients
  if (
    parsedGradient.type === "linear-gradient" ||
    parsedGradient.type === "repeating-linear-gradient"
  ) {
    if (parsedGradient.orientation?.type === "directional") {
      switch (parsedGradient.orientation.value) {
        case "left":
          additionalRotation = -90
          break
        case "right":
          additionalRotation = 90
          break
        case "bottom":
          additionalRotation = 0
          break
        case "top":
          additionalRotation = 180
          break
      }
    }

    if (!parsedGradient.orientation) {
      additionalRotation = 0 // default to bottom
    }
  }

  return initialRotation + degreesToRadians(additionalRotation)
}

function calculateTranslationToCenter(parsedGradient: GradientNode): [number, number] {
  if (
    parsedGradient.type === "linear-gradient" ||
    parsedGradient.type === "repeating-linear-gradient"
  ) {
    if (parsedGradient.orientation?.type === "directional") {
      switch (parsedGradient.orientation.value) {
        case "left":
          return [-1, -0.5]
        case "right":
          return [0, -0.5]
        case "bottom":
          return [-0.5, 0]
        case "top":
          return [-0.5, -1]
      }
    }

    if (!parsedGradient.orientation) {
      return [-0.5, 0] // default to bottom
    }
  }

  return [0, 0]
}

function degreesToRadians(degrees: number) {
  var pi = Math.PI
  return degrees * (pi / 180)
}
