import { Stack, Typography, Box } from "@mui/material"

export function PreviewNft({
  name,
  isCollection,
  image,
  description,
  attributes,
  multimedia,
  multimediaType,
  createMany,
}: {
  name: string
  isCollection: boolean
  image?: string | null
  description: string
  attributes: any[]
  multimedia?: string | null
  multimediaType?: string | null
  createMany: boolean
}) {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">{name || (!createMany && isCollection ? "Dandies" : "Dandies #1")}</Typography>
      {multimedia ? (
        <>
          {multimediaType === "video" && <video src={multimedia} autoPlay width="100%" loop />}
          {multimediaType === "audio" && <audio src={multimedia} autoPlay loop />}
          {multimediaType === "vr" && (
            <model-viewer
              src={multimedia}
              alt="Model"
              camera-controls
              ar-modes="webxr"
              width="100%"
              style={{
                width: "100%",
                height: "100%",
                minHeight: "438px",
                maxHeight: "438px",
                background: "transparent",
              }}
            ></model-viewer>
          )}
        </>
      ) : (
        <img src={image || "/logo.png"} width="100%" />
      )}

      <Typography variant="h6" color="GrayText">
        Description
      </Typography>
      <Typography variant="body1">
        {description ||
          "Delightfully Debonair Dandies swanning around the Solana blockchain in search of awesome attire"}
      </Typography>
      {!isCollection && (
        <>
          <Typography variant="h6" color="GrayText">
            Properties
          </Typography>
          <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1 }}>
            {(attributes || [])
              .filter((att) => att.trait_type || att.value)
              .map((att, index) => (
                <Box key={index} sx={{ borderRadius: "5px", border: "1px solid GrayText", padding: 1 }}>
                  <Typography color="GrayText" textTransform="uppercase">
                    {att.trait_type}
                  </Typography>
                  <Typography>{att.value}</Typography>
                </Box>
              ))}
          </Stack>
        </>
      )}
    </Stack>
  )
}
