import { Container, Textbox, Text, Button } from "@create-figma-plugin/ui"
import { emit } from "@create-figma-plugin/utilities"
import { h, JSX } from "preact"
import { useState } from "preact/hooks"
import { parseGradient } from "../lib/gradientParser"
import { ReqInsertCSSHandler } from "../shared/types"

export function App() {
  const [cssGradient, setCssGradient] = useState<string>("")
  const [validCss, setValidCss] = useState<boolean>(true)

  function handleInput(event: JSX.TargetedEvent<HTMLInputElement>) {
    setValidCss(true)
    const newValue = event.currentTarget.value
    console.log(newValue)
    setCssGradient(newValue)
  }

  function checkValidCss() {
    console.log("check valid css")
    try {
      const parsedGradient = parseGradient(cssGradient.replace(/;$/, ""))[0]
      if (parsedGradient) {
        setValidCss(true)
        return true
      } else {
        setValidCss(false)
        return false
      }
    } catch (e) {
      setValidCss(false)
      return false
    }
  }

  function handleInsert() {
    if (checkValidCss()) {
      emit<ReqInsertCSSHandler>("REQ_INSERT_CSS", cssGradient)
    }
  }

  return (
    <Container space='small' style={{ marginTop: 16 }}>
      <Text style={{ marginBottom: 8 }}>CSS Gradient</Text>
      <Textbox
        style={{ color: validCss ? "initial" : "#F24822" }}
        onInput={handleInput}
        placeholder='linear-gradient(to right, ...)'
        value={cssGradient}
        variant='border'
        // hack to make the textbox validate without clearing
        validateOnBlur={() => {
          checkValidCss()
          return true
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8
        }}
      >
        <Button onClick={handleInsert} disabled={!validCss}>
          Insert
        </Button>
        {!validCss && <Text>Invalid CSS Gradient</Text>}
      </div>
    </Container>
  )
}
