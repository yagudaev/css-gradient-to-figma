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

export type GradientNode = LinearGradient | RadialGradient

export type Length = {
  value: number
  unit: string
}

export type ColorStop = {
  type: "color-stop"
  rgba: RgbaColor
  position?: Length
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

export type RadialGradient = {
  type: "radial-gradient" | "repeating-radial-gradient"
  endingShape: "circle" | "ellipse"
  size: "closest-corner" | "closest-side" | "farthest-corner" | "farthest-side" | Length[]
  position: string
  colorStops: (ColorStop | ColorHint)[]
}

function splitSpaceArgs(nodes: Node[]): Node[] {
  return nodes.filter((it) => it.type !== "space")
}

function splitCommaArgs(nodes: Node[]): Node[][] {
  const ret: Node[][] = []
  let i = 0
  for (let j = 0; j < nodes.length; j++) {
    if (nodes[j].type === "div") {
      ret.push(splitSpaceArgs(nodes.slice(i, j)))
      i = j + 1
    }
  }
  ret.push(splitSpaceArgs(nodes.slice(i)))
  return ret
}

export function parseGradient(css: string): GradientNode[] {
  const parsed = parse(css)
  const gradients = splitCommaArgs(parsed.nodes)
  return gradients
    .filter(
      (nodes) =>
        nodes.length === 1 && nodes[0].type === "function" && nodes[0].value.includes("-gradient")
    )
    .map(([node]) => {
      const args = splitCommaArgs((node as FunctionNode).nodes)
      const type = node.value.replace(/^-webkit-/, "")
      if (type.includes("linear-gradient")) {
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
          const first = unit(args[0][0].value)
          if (first && ["deg", "turn", "rad", "grad"].includes(first.unit)) {
            ret.gradientLine = {
              type: "angle",
              value: toDegrees(first)
            }
            args.shift()
          } else {
            ret.gradientLine = {
              type: "angle",
              value: 180
            }
          }
        }
        ret.colorStops = args.map(toColorStopOrHint)
        return ret as LinearGradient
      } else if (type.includes("radial-gradient")) {
        const ret: Partial<RadialGradient> = {
          type: type as RadialGradient["type"],
          endingShape: "ellipse",
          size: "farthest-corner",
          position: "center"
        }
        let hasShape = false
        for (let i = 0; i < args[0].length; i++) {
          const arg = args[0][i]
          switch (arg.value) {
            case "circle":
            case "ellipse":
              hasShape = true
              ret.endingShape = arg.value
              break
            case "closest-corner":
            case "closest-side":
            case "farthest-corner":
            case "farthest-side":
              hasShape = true
              ret.size = arg.value
              break
            case "at":
              hasShape = true
              ret.position = args[0]
                .slice(i + 1)
                .map((it) => stringify(it))
                .join(" ")
              break
          }
          // TODO dimension size
        }
        if (hasShape) args.shift()
        ret.colorStops = args.map(toColorStopOrHint)
        return ret as RadialGradient
      }
      // TODO conic-gradient()
      throw new Error("Unsupported gradient: " + stringify(node))
    })
}

function toDegrees({ number: str, unit }: Dimension): number {
  const value = parseFloat(str)
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
    const v = unit(nodes[1].value)
    if (v) {
      return {
        type: "color-stop",
        position: dimensionToLength(v),
        rgba: toRgba(nodes[0])
      }
    }
  }
  if (nodes.length === 1) {
    if (nodes[0].type === "word") {
      const v = unit(nodes[0].value)
      if (v) {
        v.unit = v.unit.toLowerCase() || "px"
        return {
          type: "color-hint",
          hint: dimensionToLength(v)
        }
      }
    }
    return {
      type: "color-stop",
      rgba: toRgba(nodes[0])
    }
  }
  throw new Error("Invalid color stop: " + nodes.map((it) => stringify(it)).join(" "))
}

function dimensionToLength(v: Dimension): Length {
  return {
    unit: v.unit.toLowerCase() || "px",
    value: parseFloat(v.number)
  }
}
