import hexRgbLib, { RgbaObject as RGBALib } from "hex-rgb"
import rgbToHexLib from "rgb-hex"
import {
  parse as parseGradient,
  GradientNode,
  LinearGradientNode,
  RepeatingLinearGradientNode
} from "gradient-parser"
import { rotate, translate, compose, scale } from "transformation-matrix"

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

  const [sx, sy] = calculateScale(parsedGradient)
  const rotationAngle = calculateRotationAngle(parsedGradient)
  const [tx, ty] = calculateTranslationToCenter(parsedGradient)
  const gradientTransform = compose(
    translate(0, 0.5),
    scale(sx, sy),
    rotate(rotationAngle),
    translate(tx, ty)
  )
  let colorStops = parsedGradient.colorStops
  if (
    parsedGradient.type === "radial-gradient" ||
    parsedGradient.type === "repeating-radial-gradient"
  ) {
    if (
      colorStops[0].type === "literal" &&
      (colorStops[0].length?.type as string) === "position-keyword"
    ) {
      colorStops = colorStops.slice(1)
    }
  }
  console.log("color stops", colorStops)

  const figmaGradient: GradientPaint = {
    type: cssToFigmaGradientTypes(parsedGradient.type),
    gradientStops: colorStops.map((stop, index) => ({
      position: index === 0 ? 0 : index / (colorStops.length - 1),
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
  // CSS has a default unspecified angle of 180deg, figma has a default unspecified angle of 0deg
  const initialRotation = -Math.PI / 2.0 // math rotation with css 180deg default
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
        case "left top":
        case "top left":
          additionalRotation = -135
          break
        case "right top":
        case "top right":
          additionalRotation = 135
          break
        case "left bottom":
        case "bottom left":
          additionalRotation = -45
          break
        case "right bottom":
        case "bottom right":
          additionalRotation = 45
          break
        default:
          throw "unsupported linear gradient orientation"
      }
    } else if (parsedGradient.orientation?.type === "angular") {
      // css angle is clockwise from the y-axis, figma angles are counter-clockwise from the x-axis
      additionalRotation = (parseCssAngle(parsedGradient.orientation.value) + 90) % 360
      console.log(
        "parsed angle",
        parsedGradient.orientation.value,
        parseCssAngle(parsedGradient.orientation.value),
        additionalRotation
      )
      return degreesToRadians(additionalRotation)
    } else if (parsedGradient.type === "linear-gradient" && !parsedGradient.orientation) {
      additionalRotation = 0 // default to bottom
    }
  } else if (parsedGradient.type === "radial-gradient") {
    // if size is 'furthers-corner' which is the default, then the rotation is 45 to reach corner
    // any corner will do, but we will use the bottom right corner
    // since the parser is not smart enough to know that, we just assume that for now
    additionalRotation = 45
  }

  return initialRotation + degreesToRadians(additionalRotation)
}

type FigmaAngle = number // 0-360, CCW from x-axis
type CssAngle = number // 0-360, CW from y-axis

function parseCssAngle(angleStr: string): FigmaAngle {
  let angle = Number(angleStr) as CssAngle
  // positive angles only
  angle = angle < 0 ? 360 + angle : angle
  // convert to CCW angle use by figma
  angle = 360 - angle
  return angle % 360
}

function calculateScale(parsedGradient: GradientNode): [number, number] {
  if (
    parsedGradient.type === "linear-gradient" ||
    parsedGradient.type === "repeating-linear-gradient"
  ) {
    if (parsedGradient.orientation?.type === "directional") {
      switch (parsedGradient.orientation.value) {
        case "left":
        case "right":
        case "bottom":
        case "top":
          return [1.0, 1.0]
        case "left top":
        case "top left":
        case "right top":
        case "top right":
        case "left bottom":
        case "bottom left":
        case "right bottom":
        case "bottom right":
          const scale = 1 / Math.sqrt(2)
          return [scale, 1.0]
        default:
          throw "unsupported linear gradient orientation"
      }
    } else if (parsedGradient.orientation?.type === "angular") {
      return [1.0, 1.0]
    } else if (!parsedGradient.orientation) {
      return [1.0, 1.0] // default to bottom
    }
  } else if (parsedGradient.type === "radial-gradient") {
    // if size is 'furthers-corner' which is the default, then the scale is sqrt(2)
    // since the parser is not smart enough to know that, we just assume that for now
    const scale = 1 / Math.sqrt(2)
    return [scale, scale]
  }

  return [1.0, 1.0]
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
        case "left top":
        case "top left":
          return [-1, -1]
        case "right top":
        case "top right":
          return [0, -1]
        case "left bottom":
        case "bottom left":
          return [-1, 0]
        case "right bottom":
        case "bottom right":
          return [0, 0]
        default:
          throw "unsupported linear gradient orientation"
      }
    } else if (parsedGradient.orientation?.type === "angular") {
      const angle = parseCssAngle(parsedGradient.orientation.value)
      if (angle === 0) {
        return [-0.5, -1]
      } else if (angle === 90) {
        return [-1, -0.5]
      } else if (angle === 180) {
        return [-0.5, 0]
      } else if (angle === 270) {
        return [0, -0.5]
      } else if (angle > 0 && angle < 90) {
        return [-1, -1]
      } else if (angle > 90 && angle < 180) {
        return [-1, 0]
      } else if (angle > 180 && angle < 270) {
        return [0, 0]
      } else if (angle > 270 && angle < 360) {
        return [0, -1]
      }
    } else if (parsedGradient.type === "linear-gradient" && !parsedGradient.orientation) {
      return [-0.5, 0] // default to bottom
    }
  } else if (parsedGradient.type === "radial-gradient") {
    if (
      parsedGradient.colorStops[0].length?.value === "center" ||
      parsedGradient.colorStops[0].length === undefined
    ) {
      return [0, 0]
    }

    return [0, 0]
  }

  return [0, 0]
}

function degreesToRadians(degrees: number) {
  var pi = Math.PI
  return degrees * (pi / 180)
}
