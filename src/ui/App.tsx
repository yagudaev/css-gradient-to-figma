import { Container, Textbox, Text, Button } from "@create-figma-plugin/ui"
import { h, JSX } from "preact"
import { useState } from "preact/hooks"

export function App() {
  const [value, setValue] = useState<string>("")
  function handleInput(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value
    console.log(newValue)
    setValue(newValue)
  }
  return (
    <Container space='small' style={{ marginTop: 16 }}>
      <Text style={{ marginBottom: 8 }}>CSS Gradient</Text>
      <Textbox
        onInput={handleInput}
        placeholder='linear-gradient(to right, ...)'
        value={value}
        variant='border'
      />
      <Button style={{ marginTop: 8 }}>Insert</Button>
    </Container>
  )
}
