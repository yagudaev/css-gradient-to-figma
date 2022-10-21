import { rotate, translate, compose, scale } from "transformation-matrix"
import { GradientNode, parseGradient, ColorStop, ColorStopList } from "../lib/gradientParser"
import type { RgbaColor } from "colord"

function rgbaToFigmaRgba({ r, g, b, a }: RgbaColor): RGBA {
  return { r: r / 255.0, g: g / 255.0, b: b / 255.0, a: a }
}

export function cssToFigmaGradient(css: string, width = 1, height = 1): GradientPaint {
  console.log("trying to parse gradient", css)
  const parsedGradient = parseGradient(css.replace(/;$/, ""))[0]
  console.log("parsedGradient", parsedGradient)

  const gradientLength = calculateLength(parsedGradient, width, height)
  const [sx, sy] = calculateScale(parsedGradient)
  const rotationAngle = calculateRotationAngle(parsedGradient)
  const [tx, ty] = calculateTranslationToCenter(parsedGradient)
  const gradientTransform = compose(
    translate(0, 0.5),
    scale(sx, sy),
    rotate(rotationAngle),
    translate(tx, ty)
  )
  let colorStops = (parsedGradient.colorStops as ColorStopList).filter(
    (it: any) => it.type === "color-stop"
  ) as ColorStop[]
  console.log("color stops", colorStops)

  let previousPosition: number | undefined = undefined
  const figmaGradient: GradientPaint = {
    type: cssToFigmaGradientTypes(parsedGradient.type),
    gradientStops: colorStops.map((stop, index) => {
      const position = getPosition(stop, index, colorStops.length, gradientLength, previousPosition)
      previousPosition = position
      return {
        position,
        color: rgbaToFigmaRgba(stop.rgba)
      }
    }),
    gradientTransform: [
      [gradientTransform.a, gradientTransform.c, gradientTransform.e],
      [gradientTransform.b, gradientTransform.d, gradientTransform.f]
    ]
  }

  return figmaGradient
}

function getPosition(
  stop: ColorStop,
  index: number,
  total: number,
  gradientLength: number,
  previousPosition = 0
): number {
  if (total <= 1) return 0
  // browsers will enforce increasing positions (red 50%, blue 0px) becomes (red 50%, blue 50%)
  const normalize = (v: number) => Math.max(previousPosition, Math.min(1, v))
  if (stop.position) {
    if (stop.position.value <= 0) {
      // TODO: add support for negative color stops, figma doesn't support it, instead we will
      // have to scale the transform to fit the negative color stops
      return normalize(0)
    }
    switch (stop.position.unit) {
      case "%":
        return normalize(stop.position.value / 100)
      case "px":
        return normalize(stop.position.value / gradientLength)
      default:
        console.warn("Unsupported stop position unit: ", stop.position.unit)
    }
  }
  return normalize(index / (total - 1))
}

function cssToFigmaGradientTypes(
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
    if (parsedGradient.gradientLine.type === "side-or-corner") {
      switch (parsedGradient.gradientLine.value) {
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
    } else {
      // css angle is clockwise from the y-axis, figma angles are counter-clockwise from the x-axis
      additionalRotation = (convertCssAngle(parsedGradient.gradientLine.value) + 90) % 360
      console.log(
        "parsed angle",
        parsedGradient.gradientLine.value,
        convertCssAngle(parsedGradient.gradientLine.value),
        additionalRotation
      )
      return degreesToRadians(additionalRotation)
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

function convertCssAngle(angle: CssAngle): FigmaAngle {
  // positive angles only
  angle = angle < 0 ? 360 + angle : angle
  // convert to CCW angle use by figma
  angle = 360 - angle
  return angle % 360
}

function calculateLength(parsedGradient: GradientNode, width: number, height: number): number {
  if (
    parsedGradient.type === "linear-gradient" ||
    parsedGradient.type === "repeating-linear-gradient"
  ) {
    if (parsedGradient.gradientLine.type === "side-or-corner") {
      switch (parsedGradient.gradientLine.value) {
        case "left":
        case "right":
          return width
        case "bottom":
        case "top":
          return height
        case "left top":
        case "top left":
        case "right top":
        case "top right":
        case "left bottom":
        case "bottom left":
        case "right bottom":
        case "bottom right":
          return Math.sqrt(width ^ (2 + height) ^ 2)
        default:
          throw "unsupported linear gradient orientation"
      }
    } else if (parsedGradient.gradientLine.type === "angle") {
      // from w3c: abs(W * sin(A)) + abs(H * cos(A))
      // https://w3c.github.io/csswg-drafts/css-images-3/#linear-gradients
      const rads = degreesToRadians(convertCssAngle(parsedGradient.gradientLine.value))
      return Math.abs(width * Math.sin(rads)) + Math.abs(height * Math.cos(rads))
    } else if (!parsedGradient.gradientLine) {
      return height // default to bottom
    }
  } else if (parsedGradient.type === "radial-gradient") {
    // if size is 'furthers-corner' which is the default, then the scale is sqrt(2)
    // since the parser is not smart enough to know that, we just assume that for now
    return Math.sqrt(2)
  }
  throw "unsupported gradient type"
}

function calculateScale(parsedGradient: GradientNode): [number, number] {
  if (
    parsedGradient.type === "linear-gradient" ||
    parsedGradient.type === "repeating-linear-gradient"
  ) {
    if (parsedGradient.gradientLine.type === "side-or-corner") {
      switch (parsedGradient.gradientLine.value) {
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
    } else if (parsedGradient.gradientLine.type === "angle") {
      // from w3c: abs(W * sin(A)) + abs(H * cos(A))
      // https://w3c.github.io/csswg-drafts/css-images-3/#linear-gradients
      // W and H are unit vectors, so we can just use 1
      const scale =
        Math.abs(Math.sin(degreesToRadians(convertCssAngle(parsedGradient.gradientLine.value)))) +
        Math.abs(Math.cos(degreesToRadians(convertCssAngle(parsedGradient.gradientLine.value))))

      return [1.0 / scale, 1.0 / scale]
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
    if (parsedGradient.gradientLine.type === "side-or-corner") {
      switch (parsedGradient.gradientLine.value) {
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
    } else if (parsedGradient.gradientLine.type === "angle") {
      const angle = convertCssAngle(parsedGradient.gradientLine.value)
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
    } else if (parsedGradient.type === "linear-gradient" && !parsedGradient.gradientLine) {
      return [-0.5, 0] // default to bottom
    }
  } else if (parsedGradient.type === "radial-gradient") {
    if (parsedGradient.position === "center") {
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
