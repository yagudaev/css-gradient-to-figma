import { EventHandler } from "@create-figma-plugin/utilities"

export interface ResizeWindowHandler extends EventHandler {
  name: "RESIZE_WINDOW"
  handler: (windowSize: { width: number; height: number }) => void
}

export interface ReqInsertCSSHandler extends EventHandler {
  name: "REQ_INSERT_CSS"
  handler: (css: string) => void
}
