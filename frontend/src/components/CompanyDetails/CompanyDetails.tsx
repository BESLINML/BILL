import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Save, RestartAlt } from "@mui/icons-material";
import StateAutocomplete from "../Shared/StateAutocomplete";
import type { CompanyDetails } from "../../types/CompanyDetailsType";
import { getCompanyDetails, saveCompanyDetails } from "../../api/companyApi";
import {
  isValidAccountNumber, isValidEmail, isValidGstin, isValidIfsc, isValidPan,
  isValidPhone, isValidPostalCode, isValidWebsite,
} from "../../utils/validation";

const STORAGE_KEY = "billing-app-company-details";
const COMPANY_SEAL_KEY = "billing-app-company-seal";
const COMPANY_SIGNATURE_KEY = "billing-app-company-signature";
const MAX_IMAGE_BYTES = 1024 * 1024;

const emptyDetails: CompanyDetails = {
  companyName: "",
  gstin: "",
  pan: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  accountType: "",
  ifscCode: "",
  bankBranch: "",
};

function readSavedDetails(): CompanyDetails {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...emptyDetails, ...JSON.parse(saved) as Partial<CompanyDetails> } : emptyDetails;
  } catch {
    return emptyDetails;
  }
}

export default function CompanyDetailsPage() {
  const [details, setDetails] = useState<CompanyDetails>(readSavedDetails);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CompanyDetails, string>>>({});
  const [companySeal, setCompanySeal] = useState(() => localStorage.getItem(COMPANY_SEAL_KEY) || "");
  const [companySignature, setCompanySignature] = useState(() => localStorage.getItem(COMPANY_SIGNATURE_KEY) || "");
  const sealInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCompanyDetails()
      .then(async (remote) => {
        if (cancelled) return;
        if (remote) {
          setDetails({ ...emptyDetails, ...remote });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          return;
        }
        const cached = readSavedDetails();
        if (cached.companyName || cached.state || cached.gstin) {
          await saveCompanyDetails(cached);
          if (!cancelled) setDetails(cached);
        }
      })
      .catch(() => { if (!cancelled) setError("Could not load company details from the API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const updateField = (field: keyof CompanyDetails, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
    setError("");
  };

  const uploadImage = (file: File | undefined, type: "seal" | "signature") => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG, or WebP image for the seal or signature.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Each seal or signature image must be 1 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      try {
        localStorage.setItem(type === "seal" ? COMPANY_SEAL_KEY : COMPANY_SIGNATURE_KEY, reader.result);
        if (type === "seal") setCompanySeal(reader.result);
        else setCompanySignature(reader.result);
        setError("");
        setMessage(`${type === "seal" ? "Digital seal" : "Digital signature"} saved for invoices.`);
      } catch {
        setError("Could not save the image in this browser. Try a smaller image.");
      }
    };
    reader.onerror = () => setError("Could not read that image.");
    reader.readAsDataURL(file);
  };

  const removeImage = (type: "seal" | "signature") => {
    localStorage.removeItem(type === "seal" ? COMPANY_SEAL_KEY : COMPANY_SIGNATURE_KEY);
    if (type === "seal") {
      setCompanySeal("");
      if (sealInputRef.current) sealInputRef.current.value = "";
    } else {
      setCompanySignature("");
      if (signatureInputRef.current) signatureInputRef.current.value = "";
    }
    setMessage(`${type === "seal" ? "Digital seal" : "Digital signature"} removed from invoices.`);
    setError("");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof CompanyDetails, string>> = {};
    if (!details.companyName.trim()) nextErrors.companyName = "Enter your registered company name.";
    if (!details.state.trim()) nextErrors.state = "Enter the seller state for GST calculation.";
    if (!isValidEmail(details.email)) nextErrors.email = "Enter a valid email address, such as name@gmail.com.";
    if (!isValidPhone(details.phone)) nextErrors.phone = "Enter a valid phone number with 8–15 digits.";
    if (!isValidWebsite(details.website)) nextErrors.website = "Enter a valid website URL starting with http:// or https://.";
    if (!isValidGstin(details.gstin)) nextErrors.gstin = "GSTIN must be 15 characters in a valid GSTIN format.";
    if (!isValidPan(details.pan)) nextErrors.pan = "PAN must contain 5 letters, 4 digits, and 1 letter.";
    if (!isValidPostalCode(details.postalCode)) nextErrors.postalCode = "Enter a 6-digit PIN code.";
    if (!isValidAccountNumber(details.accountNumber)) nextErrors.accountNumber = "Account number must contain 9–18 digits.";
    if (!isValidIfsc(details.ifscCode)) nextErrors.ifscCode = "IFSC must be 11 characters, for example ABCD0123456.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError("Please correct the highlighted fields before saving.");
      setMessage("");
      return;
    }
    setSaving(true);
    try {
      await saveCompanyDetails(details);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(details));
      setMessage("Company details saved.");
      setError("");
    } catch {
      setError("Could not save company details. Check the API connection and try again.");
      setMessage("");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      await saveCompanyDetails(emptyDetails);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      setError("Could not clear saved details from this browser.");
      setSaving(false);
      return;
    }
    setDetails(emptyDetails);
    setFieldErrors({});
    setMessage("");
    setError("");
    setSaving(false);
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Company details</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Add the business information used for billing and invoices.
        </Typography>
      </Box>

      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper component="form" variant="outlined" onSubmit={handleSave} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, maxWidth: 920 }}>
        <Stack sx={{ display: "flex", gap: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Business information</Typography>
            <Typography variant="body2" color="text.secondary">Your registered name and tax identifiers.</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Company or legal name" required fullWidth value={details.companyName} error={Boolean(fieldErrors.companyName)} helperText={fieldErrors.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
            <TextField label="GSTIN" fullWidth value={details.gstin} error={Boolean(fieldErrors.gstin)} helperText={fieldErrors.gstin} onChange={(event) => updateField("gstin", event.target.value.toUpperCase())} slotProps={{ htmlInput: { maxLength: 15 } }} />
            <TextField label="PAN" fullWidth value={details.pan} error={Boolean(fieldErrors.pan)} helperText={fieldErrors.pan} onChange={(event) => updateField("pan", event.target.value.toUpperCase())} slotProps={{ htmlInput: { maxLength: 10 } }} />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Contact information</Typography>
            <Typography variant="body2" color="text.secondary">How customers can reach your business.</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Business email" type="email" fullWidth value={details.email} error={Boolean(fieldErrors.email)} helperText={fieldErrors.email} onChange={(event) => updateField("email", event.target.value)} />
            <TextField label="Phone" type="tel" fullWidth value={details.phone} error={Boolean(fieldErrors.phone)} helperText={fieldErrors.phone} onChange={(event) => updateField("phone", event.target.value)} slotProps={{ htmlInput: { maxLength: 20, inputMode: "tel" } }} />
            <TextField label="Website" type="url" fullWidth value={details.website} error={Boolean(fieldErrors.website)} helperText={fieldErrors.website} onChange={(event) => updateField("website", event.target.value)} />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Billing address</Typography>
            <Typography variant="body2" color="text.secondary">The address shown on your billing documents.</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Street address" multiline minRows={2} fullWidth value={details.address} onChange={(event) => updateField("address", event.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
            <TextField label="City" fullWidth value={details.city} onChange={(event) => updateField("city", event.target.value)} />
            <StateAutocomplete value={details.state} error={Boolean(fieldErrors.state)} helperText={fieldErrors.state} onChange={(value) => updateField("state", value)} />
            <TextField label="PIN code" fullWidth value={details.postalCode} error={Boolean(fieldErrors.postalCode)} helperText={fieldErrors.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} slotProps={{ htmlInput: { maxLength: 6, inputMode: "numeric" } }} />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Bank details</Typography>
            <Typography variant="body2" color="text.secondary">Bank information for payment instructions on invoices.</Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Bank name" fullWidth value={details.bankName} onChange={(event) => updateField("bankName", event.target.value)} />
            <TextField label="Account holder name" fullWidth value={details.accountHolderName} onChange={(event) => updateField("accountHolderName", event.target.value)} />
            <TextField label="Account number" fullWidth value={details.accountNumber} error={Boolean(fieldErrors.accountNumber)} helperText={fieldErrors.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value)} slotProps={{ htmlInput: { maxLength: 18, inputMode: "numeric" } }} />
            <TextField label="Account type" placeholder="Current or savings" fullWidth value={details.accountType} onChange={(event) => updateField("accountType", event.target.value)} />
            <TextField label="IFSC code" fullWidth value={details.ifscCode} error={Boolean(fieldErrors.ifscCode)} helperText={fieldErrors.ifscCode} onChange={(event) => updateField("ifscCode", event.target.value.toUpperCase())} slotProps={{ htmlInput: { maxLength: 11 } }} />
            <TextField label="Branch" fullWidth value={details.bankBranch} onChange={(event) => updateField("bankBranch", event.target.value)} />
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Company digital seal and signature</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Upload the company seal first, then add the digital signature over it. This combined mark appears at the bottom of your invoices.</Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, maxWidth: 520 }}>
              <Box sx={{ minHeight: 200, border: "1px dashed", borderColor: "divider", borderRadius: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 1, mb: 1.5 }}>
                {companySeal ? <>
                  <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5 }}>For {details.companyName || "Company Name"}</Typography>
                  <Box sx={{ position: "relative", width: 190, height: 156, display: "flex", justifyContent: "center", alignItems: "flex-start", overflow: "visible" }}>
                    <Box component="img" src={companySeal} alt="Company digital seal" sx={{ width: 104, height: 104, objectFit: "contain" }} />
                    {companySignature && <Box component="img" src={companySignature} alt="Digital signature over company seal" sx={{ position: "absolute", left: "50%", top: 52, transform: "translateX(-50%)", width: 190, height: 96, objectFit: "contain", zIndex: 1 }} />}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>Sign and Seal</Typography>
                </> : <Typography variant="caption" color="text.secondary">Upload a company seal to begin</Typography>}
              </Box>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <input ref={sealInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(event.target.files?.[0], "seal")} />
                <Button size="small" variant="outlined" onClick={() => sealInputRef.current?.click()}>{companySeal ? "Update seal" : "Upload seal"}</Button>
                {companySeal && <Button size="small" color="inherit" onClick={() => removeImage("seal")}>Remove seal</Button>}
                <input ref={signatureInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadImage(event.target.files?.[0], "signature")} />
                <Button size="small" variant="outlined" disabled={!companySeal} onClick={() => signatureInputRef.current?.click()}>{companySignature ? "Update signature" : "Upload signature inside seal"}</Button>
                {companySignature && <Button size="small" color="inherit" onClick={() => removeImage("signature")}>Remove signature</Button>}
              </Stack>
            </Paper>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>PNG, JPG, or WebP, up to 1 MB each. Saved in this browser.</Typography>
          </Box>

          <Stack sx={{ display: "flex", flexDirection: { xs: "column-reverse", sm: "row" }, justifyContent: "flex-end", gap: 1 }}>
            <Button type="button" color="inherit" startIcon={<RestartAlt />} onClick={() => void handleReset()} disabled={saving || loading}>Reset details</Button>
            <Button type="submit" variant="contained" startIcon={<Save />} disabled={saving || loading}>{saving ? "Saving…" : "Save company details"}</Button>
          </Stack>
        </Stack>
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Details are stored with the billing data and used on invoices.
      </Typography>
    </Box>
  );
}
