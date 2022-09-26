import { on, showUI } from "@create-figma-plugin/utilities"
import { cssToFigmaGradient } from "./shared/color"

import { ReqInsertCSSHandler, ResizeWindowHandler } from "./shared/types"

export default function () {
  on<ResizeWindowHandler>(
    "RESIZE_WINDOW",
    function (windowSize: { width: number; height: number }) {
      const { width, height } = windowSize
      figma.ui.resize(width, height)
    }
  )
  showUI({
    height: 120,
    width: 300
  })

  let lastX = 0
  let lastY = 0
  on<ReqInsertCSSHandler>("REQ_INSERT_CSS", function (css: string) {
    let target = figma.currentPage.selection[0]
    if (figma.currentPage.selection.length === 0) {
      const rect = figma.createRectangle()
      rect.cornerRadius = 5
      rect.x = lastX
      figma.currentPage.appendChild(rect)
      target = rect
      lastX += 110
    }

    // check if target has fills property
    if ("fills" in target) {
      const gradient = cssToFigmaGradient(css)
      target.fills = [gradient]
    } else {
      figma.notify("Please select a shape or frame with a fill")
    }
  })
}
