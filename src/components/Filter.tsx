import React, { useState } from 'react';
import {
  Button,
  Slider,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  RadioGroup,
  Radio,
} from '@mui/material';

const FilterComponent: React.FC = () => {
  const [priceRange, setPriceRange] = useState<number[]>([10, 150]);

  const handlePriceChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      setPriceRange(newValue);
    }
  };

  return (
    <Box>
      <Typography variant="h5">Preis</Typography>
      <Slider
        value={priceRange}
        onChange={handlePriceChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value} €`}
        min={10}
        max={150}
        step={5}
      />
      <Typography variant="body2">
        Der durchschnittliche Stundensatz beträgt {priceRange[0]}€ – {priceRange[1]}€
      </Typography>

      <Typography variant="h5" sx={{ mt: 2 }}>Tageszeit</Typography>
      <FormControlLabel
        control={<Checkbox />}
        label="Morgens/Vormittags (08:00 – 12:00 Uhr)"
      />
      <FormControlLabel
        control={<Checkbox />}
        label="Nachmittags (12:00 – 17:00 Uhr)"
      />
      <FormControlLabel
        control={<Checkbox />}
        label="Abends (17:00 – 21:30 Uhr)"
      />

      <Typography variant="h5" sx={{ mt: 2 }}>Datum</Typography>
      <RadioGroup defaultValue="within_a_week">
        <FormControlLabel value="today" control={<Radio />} label="Heute" />
        <FormControlLabel value="within_a_week" control={<Radio />} label="Innerhalb einer Woche" />
        <FormControlLabel value="within_three_days" control={<Radio />} label="Innerhalb von 3 Tagen" />
      </RadioGroup>

      <Button variant="contained" sx={{ mt: 2 }}>Weitere Filter</Button>
    </Box>
  );
};

export default FilterComponent;

