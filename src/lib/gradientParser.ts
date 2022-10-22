import parse, { Node, FunctionNode, unit, Dimension, stringify } from "postcss-value-parser"
import { colord, extend, RgbaColor } from "colord"
import namesPlugin from "colord/plugins/names"

extend([namesPlugin])

export interface SideOrCornerGradientLine {
  type: "side-or-corner"
  value:
    | "left"
    | "top"
    | "bottom"
    | "right"
    | "left top"
    | "top left"
    | "left bottom"
    | "bottom left"
    | "right top"
    | "top right"
    | "right bottom"
    | "bottom right"
}

export type GradientType =
  | "linear-gradient"
  | "repeating-linear-gradient"
  | "radial-gradient"
  | "repeating-radial-gradient"
  | "conic-gradient"

export type AngleGradientLine = {
  type: "angle"
  // Normalized to degrees
  value: number
}

export type GradientNode = LinearGradient | RadialGradient | ConicGradient

export type Length = {
  value: number
  unit: string
}

export type ColorStopList = ColorStopListItem[]
export type ColorStopListItem = ColorStop | ColorHint | AngularColorStop

export type ColorStop = {
  type: "color-stop"
  rgba: RgbaColor
  position?: Length
}

export type AngularColorStop = {
  type: "angular-color-stop"
  rgba: RgbaColor
  angle?: Length | [Length, Length]
}

export type ColorHint = {
  type: "color-hint"
  hint: Length
}

export type LinearGradient = {
  type: "linear-gradient" | "repeating-linear-gradient"
  gradientLine: SideOrCornerGradientLine | AngleGradientLine
  colorStops: (ColorStop | ColorHint)[]
}

export type ConicGradient = {
  type: "conic-gradient" | "repeating-conic-gradient"
  // Normalized to degrees
  angle?: number
  position: string
  colorStops: (AngularColorStop | ColorHint)[]
}

export type RadialGradient = {
  type: "radial-gradient" | "repeating-radial-gradient"
  endingShape: "circle" | "ellipse"
  size: "closest-corner" | "closest-side" | "farthest-corner" | "farthest-side" | Length[]
  position: string
  colorStops: (ColorStop | ColorHint)[]
}

const ANGLE_UNITS = ["deg", "turn", "rad", "grad"]
const ANGLE_OR_PERCENTAGE_UNITS = [...ANGLE_UNITS, "%"]

export function parseGradient(css: string): GradientNode[] {
  const parsed = parse(css)
  const gradients = splitCommaArgs(parsed.nodes)
  return gradients
    .filter(
      (nodes) =>
        // background-image can include non-gradient values, we can ignore them
        nodes.length === 1 && nodes[0].type === "function" && nodes[0].value.includes("-gradient")
    )
    .map(([node]) => {
      const args = splitCommaArgs((node as FunctionNode).nodes)
      // strip vendor prefixes
      const type = node.value.replace(/^-webkit-/, "")

      if (type.includes("linear-gradient")) {
        return parseLinearGradient(type, args)
      } else if (type.includes("radial-gradient")) {
        return parseRadialGradient(type, args)
      } else if (type.includes("conic-gradient")) {
        return parseConicGradient(type, args)
      }
      throw new Error("Unsupported gradient: " + stringify(node))
    })
}

function parseLinearGradient(type: string, args: parse.Node[][]) {
  const ret: Partial<LinearGradient> = {
    type: type as LinearGradient["type"]
  }

  if (args[0][0].value === "to") {
    ret.gradientLine = {
      type: "side-or-corner",
      value: args
        .shift()!
        .slice(1)
        .map((it) => it.value)
        .join(" ") as SideOrCornerGradientLine["value"]
    }
  } else {
    const first = toUnit(args[0][0], "deg")
    if (first && ANGLE_UNITS.includes(first.unit)) {
      ret.gradientLine = {
        type: "angle",
        value: toDegrees(first)
      }
      args.shift()
    } else {
      // default gradient line if none is specified
      ret.gradientLine = {
        type: "angle",
        value: 180
      }
    }
  }

  ret.colorStops = args.map(toColorStopOrHint)

  return ret as LinearGradient
}

function parseRadialGradient(type: string, args: parse.Node[][]) {
  const ret: Partial<RadialGradient> = {
    type: type as RadialGradient["type"],
    endingShape: "ellipse",
    size: "farthest-corner",
    position: "center"
  }

  let hasOptionalArg = false
  loop: for (let i = 0; i < args[0].length; i++) {
    const arg = args[0][i]
    switch (arg.value) {
      //  ending shape
      case "circle":
      case "ellipse":
        hasOptionalArg = true
        ret.endingShape = arg.value
        break

      // size = extent-keyword
      case "closest-corner":
      case "closest-side":
      case "farthest-corner":
      case "farthest-side":
        hasOptionalArg = true
        ret.size = arg.value
        break

      // position
      case "at":
        hasOptionalArg = true
        ret.position = stringifySpacedArgs(args[0].slice(i + 1))
        break loop

      // length or percentage
      default:
        let length = toUnit(arg, "px")
        if (length) {
          hasOptionalArg = true
          if (!Array.isArray(ret.size)) ret.size = []

          ret.size.push(length)
        } else if (!hasOptionalArg) {
          break loop
        }
    }
  }
  if (hasOptionalArg) args.shift()

  ret.colorStops = args.map(toColorStopOrHint)

  return ret as RadialGradient
}

function parseConicGradient(type: string, args: parse.Node[][]) {
  const ret: Partial<ConicGradient> = {
    type: type as ConicGradient["type"],
    position: "center"
  }

  let hasOptionalArg = false
  const optionsArg = args[0]

  if (optionsArg[0].value === "from") {
    const value = toUnit(optionsArg[1], "deg")
    if (!value) throw new Error(`Angle expected: ` + stringify(optionsArg[1]))
    ret.angle = toDegrees(value)
    optionsArg.splice(0, 2)
    hasOptionalArg = true
  }

  if (optionsArg[0].value === "at") {
    ret.position = stringifySpacedArgs(optionsArg.slice(1))
    hasOptionalArg = true
  }

  if (hasOptionalArg) args.shift()

  ret.colorStops = args.map(toAngularColorStopOrHint)

  return ret as ConicGradient
}

function splitSpaceArgs(nodes: Node[]): Node[] {
  return nodes.filter((it) => it.type !== "space")
}

function splitCommaArgs(nodes: Node[]): Node[][] {
  const result: Node[][] = []
  let prevCommaPos = 0
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type === "div") {
      result.push(splitSpaceArgs(nodes.slice(prevCommaPos, i)))
      prevCommaPos = i + 1
    }
  }
  result.push(splitSpaceArgs(nodes.slice(prevCommaPos)))
  return result
}

function toUnit(node: Node | undefined, unitForZero: string): Length | false {
  if (node?.type !== "word") return false

  const ret = unit(node.value)
  if (!ret) return false

  if (ret.unit) {
    ret.unit = ret.unit.toLowerCase()
  } else if (ret.number === "0") {
    // only 0 can be specified w/o unit
    ret.unit = unitForZero
  } else {
    return false
  }

  return {
    unit: ret.unit,
    value: parseFloat(ret.number)
  }
}

function toDegrees({ value, unit }: Length): number {
  switch (unit.toLowerCase()) {
    case "deg":
      return value
    case "rad":
      return (180 * value) / Math.PI
    case "grad":
      return (360 * value) / 400
    case "turn":
      return 360 * value
  }
  throw new Error("Unsupported dimension: " + unit)
}

function toRgba(node: Node): RgbaColor {
  return colord(stringify(node)).toRgb()
}

function toColorStopOrHint(nodes: Node[]): ColorStop | ColorHint {
  if (nodes.length === 2) {
    const position = toUnit(nodes[1], "px")
    if (position) {
      return {
        type: "color-stop",
        position,
        rgba: toRgba(nodes[0])
      }
    }
  }

  if (nodes.length === 1) {
    const hint = toUnit(nodes[0], "px")
    if (hint) {
      return {
        type: "color-hint",
        hint
      }
    }
    return {
      type: "color-stop",
      rgba: toRgba(nodes[0])
    }
  }

  throw new Error("Invalid color stop: " + stringifySpacedArgs(nodes))
}

function toAngularColorStopOrHint(nodes: Node[]): AngularColorStop | ColorHint {
  if (nodes.length === 1) {
    const hint = toUnit(nodes[0], "deg")
    if (hint && ANGLE_OR_PERCENTAGE_UNITS.includes(hint.unit)) {
      return {
        type: "color-hint",
        hint
      }
    }

    return {
      type: "angular-color-stop",
      rgba: toRgba(nodes[0])
    }
  }

  if (nodes.length === 2) {
    const angle = toUnit(nodes[1], "deg")
    if (angle && ANGLE_OR_PERCENTAGE_UNITS.includes(angle.unit)) {
      return {
        type: "angular-color-stop",
        rgba: toRgba(nodes[0]),
        angle
      }
    }
  }

  if (nodes.length === 3) {
    const angles = nodes.slice(1, 3).map((it) => toUnit(it, "deg"))
    if (angles.every((v) => v && ANGLE_OR_PERCENTAGE_UNITS.includes(v.unit))) {
      return {
        type: "angular-color-stop",
        rgba: toRgba(nodes[0]),
        angle: angles as AngularColorStop["angle"]
      }
    }
  }

  throw new Error("Invalid angular color stop: " + stringifySpacedArgs(nodes))
}

function stringifySpacedArgs(nodes: Node[]): string {
  return nodes.map((it) => stringify(it)).join(" ")
}
