import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { INDIAN_STATES_AND_UNION_TERRITORIES } from "../../constants/indianStates";

interface StateAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
}

export default function StateAutocomplete({ value, onChange, error = false, helperText }: StateAutocompleteProps) {
  const selectedValue = INDIAN_STATES_AND_UNION_TERRITORIES.includes(value) ? value : null;

  return (
    <Autocomplete
      freeSolo
      options={INDIAN_STATES_AND_UNION_TERRITORIES}
      value={selectedValue}
      inputValue={value}
      onChange={(_, nextValue) => onChange(nextValue ?? "")}
      onInputChange={(_, nextInputValue, reason) => {
        if (reason === "input" || reason === "clear") onChange(nextInputValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="State or union territory"
          required
          fullWidth
          error={error}
          helperText={helperText || "Choose from the list or type a state name."}
        />
      )}
    />
  );
}
