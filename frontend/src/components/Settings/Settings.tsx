import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useAppearance } from "../../useAppearance";
import { colorThemes, textThemes } from "../../theme";

export default function Settings() {
  const { colorTheme, textTheme, setColorTheme, setTextTheme } = useAppearance();

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">Appearance</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Personalize the color palette and typography used across your billing workspace.
        </Typography>
      </Box>

      <Stack sx={{ gap: 4 }}>
        <Box>
          <Box sx={{ mb: 1.75 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Color combinations</Typography>
            <Typography variant="body2" color="text.secondary">Choose an accent palette for navigation, buttons, and highlights.</Typography>
          </Box>
          <Grid container spacing={2}>
            {colorThemes.map((preset) => {
              const selected = colorTheme === preset.id;
              return (
                <Grid key={preset.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                  <Card variant="outlined" sx={{ height: "100%", borderColor: selected ? "primary.main" : "divider", borderWidth: selected ? 2 : 1, borderRadius: 3, boxShadow: selected ? (theme) => `0 0 0 3px ${theme.palette.primary.main}18` : "none" }}>
                    <ButtonBase onClick={() => setColorTheme(preset.id)} aria-pressed={selected} sx={{ width: "100%", height: "100%", textAlign: "left", display: "block", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.25 }}>
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{preset.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{preset.description}</Typography>
                          </Box>
                          {selected && <CheckCircleIcon color="primary" fontSize="small" aria-label="Selected" />}
                        </Stack>
                        <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 2.25 }}>
                          <Box sx={{ width: 40, height: 25, bgcolor: preset.main, borderRadius: 1.25 }} />
                          <Box sx={{ width: 40, height: 25, bgcolor: preset.dark, borderRadius: 1.25 }} />
                          <Box sx={{ width: 40, height: 25, bgcolor: preset.light, borderRadius: 1.25, border: 1, borderColor: "divider" }} />
                          <Box sx={{ width: 40, height: 25, bgcolor: preset.secondary, borderRadius: 1.25 }} />
                        </Stack>
                      </CardContent>
                    </ButtonBase>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        <Box>
          <Box sx={{ mb: 1.75 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Text style combinations</Typography>
            <Typography variant="body2" color="text.secondary">Preview each type style and select the one that suits your work.</Typography>
          </Box>
          <Grid container spacing={2}>
            {textThemes.map((preset) => {
              const selected = textTheme === preset.id;
              return (
                <Grid key={preset.id} size={{ xs: 12, sm: 6, xl: 4 }}>
                  <Card variant="outlined" sx={{ height: "100%", borderColor: selected ? "primary.main" : "divider", borderWidth: selected ? 2 : 1, borderRadius: 3, boxShadow: selected ? (theme) => `0 0 0 3px ${theme.palette.primary.main}18` : "none" }}>
                    <ButtonBase onClick={() => setTextTheme(preset.id)} aria-pressed={selected} sx={{ width: "100%", height: "100%", textAlign: "left", display: "block", borderRadius: 2 }}>
                      <CardContent sx={{ p: 2.25 }}>
                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{preset.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{preset.description}</Typography>
                          </Box>
                          {selected && <CheckCircleIcon color="primary" fontSize="small" aria-label="Selected" />}
                        </Stack>
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: "background.default", borderRadius: 2 }}>
                          <Typography sx={{ fontFamily: preset.headingFont, fontWeight: preset.headingWeight, letterSpacing: preset.tracking, fontSize: "1.25rem" }}>Aa — Billing 123</Typography>
                          <Typography variant="body2" sx={{ fontFamily: preset.bodyFont, lineHeight: preset.lineHeight, mt: 0.5 }}>
                            Customer invoices, products and payments.
                          </Typography>
                        </Box>
                      </CardContent>
                    </ButtonBase>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
        <Typography variant="caption" color="text.secondary">Your appearance preferences are saved in this browser.</Typography>
      </Stack>
    </Box>
  );
}
