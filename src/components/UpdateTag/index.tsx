import { Dialog, DialogTitle, Typography, DialogContent, Stack, TextField, RadioGroup, Radio, FormControlLabel, DialogActions, Button, Box } from "@mui/material";
import { FC, useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useTags } from "../../context/tags";

const presets = [
  "#6cbec9",
  "#9c27b0",
  "#2e7d32",
  "#d32f2f",
  "#cc7722"
]

export const UpdateTag: FC = ({ id, name: initialName, color: initialColor, open, setOpen, onUpdate }) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const { deleteTag } = useTags();

  useEffect(() => {
    setName(initialName)
  }, [initialName])

  useEffect(() => {
    setColor(initialColor)
    setCustomColor(initialColor || presets[0])
  }, [initialColor])

  const [customColor, setCustomColor] = useState(initialColor || presets[0]);

  useEffect(() => {
    if (color === 'custom') {
      return;
    }
    if (!presets.includes(color)) {
      setColor("custom")
    }
  }, [color])

  function toggleOpen() {
    setOpen(!open)
  }

  async function onSave() {
    await onUpdate(id, name, color === "custom" ? customColor : color)
    toggleOpen()
  }

  async function onDelete() {
    await deleteTag(id)
    setOpen(false);
  }

  return (
    <Dialog open={open} onClose={toggleOpen}>
        <DialogTitle><Typography variant="h5">{id ? "Update" : "Add new"} tag</Typography></DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              inputRef={input => input && input.focus()}
              label="Tag name"
              inputProps={{
                "data-form-type": "other"
              }}
            />
            <Typography variant="h5">Colour</Typography>
              <RadioGroup
                value={color}
                onChange={(e, color) => setColor(color)}
              >
                <Stack spacing={2} direction={"row"}>
                  {
                    presets.map(preset => {
                      return <Radio
                      sx={{
                        '&, &.Mui-checked': {
                          color: preset,
                        },
                      
                      }}
                      value={preset}
                    />
                    })
                  }
                  <FormControlLabel control={<Radio
                    sx={{
                      '&, &.Mui-checked': {
                        color: customColor,
                      },
                    }}
                    value="custom"
                  />} label="Custom color" />
                  
                </Stack>
              </RadioGroup>
              <HexColorPicker color={customColor} onChange={setCustomColor} style={{width: '100%' }}/>
            </Stack>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" width="100%" justifyContent="space-between">
            {
              id
                ? (
                  <Button onClick={onDelete} variant="contained" color="error">
                    Delete
                  </Button>
                )
                : <Box /> 
            }
            <Stack direction="row">
              <Button onClick={toggleOpen} color="error">
                Cancel
              </Button>
              <Button onClick={onSave} variant="contained">
                Save
              </Button>
            </Stack>
          </Stack>
          
        </DialogActions>
      </Dialog>
  )
}