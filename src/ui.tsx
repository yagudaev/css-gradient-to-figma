import { render, useWindowResize } from "@create-figma-plugin/ui"
import { emit } from "@create-figma-plugin/utilities"
import { h } from "preact"

import { ResizeWindowHandler } from "./types"
import { App } from "./ui/App"

function Plugin() {
  function onWindowResize(windowSize: { width: number; height: number }) {
    emit<ResizeWindowHandler>("RESIZE_WINDOW", windowSize)
  }
  useWindowResize(onWindowResize, {
    maxHeight: 320,
    maxWidth: 320,
    minHeight: 120,
    minWidth: 120,
    resizeBehaviorOnDoubleClick: "minimize"
  })
  return <App />
}

export default render(Plugin)
