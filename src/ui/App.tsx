import { Container, Textbox, Text, Button } from "@create-figma-plugin/ui"
import { emit } from "@create-figma-plugin/utilities"
import { h, JSX } from "preact"
import { useState } from "preact/hooks"
import { ReqInsertCSSHandler } from "../shared/types"

export function App() {
  const [cssGradient, setCssGradient] = useState<string>("")
  function handleInput(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value
    console.log(newValue)
    setCssGradient(newValue)
  }

  function handleInsert() {
    emit<ReqInsertCSSHandler>("REQ_INSERT_CSS", cssGradient)
  }

  return (
    <Container space='small' style={{ marginTop: 16 }}>
      <Text style={{ marginBottom: 8 }}>CSS Gradient</Text>
      <Textbox
        onInput={handleInput}
        placeholder='linear-gradient(to right, ...)'
        value={cssGradient}
        variant='border'
      />
      <Button style={{ marginTop: 8 }} onClick={handleInsert}>
        Insert
      </Button>
    </Container>
  )
}
