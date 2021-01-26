export function getMoonPhase(date) {
  let year, month, day;

  year = date.getFullYear();
  month = date.getMonth();
  day = date.getDate();

  var c = (e = jd = b = 0);

  if (month < 3) {
    year--;
    month += 12;
  }

  ++month;

  c = 365.25 * year;

  e = 30.6 * month;

  jd = c + e + day - 694039.09; //jd is total days elapsed

  jd /= 29.5305882; //divide by the moon cycle

  b = parseInt(jd); //int(jd) -> b, take integer part of jd

  jd -= b; //subtract integer part to leave fractional part of original jd

  b = Math.round(jd * 8); //scale fraction from 0-8 and round

  if (b >= 8) {
    b = 0; //0 and 8 are the same so turn 8 into 0
  }

  // 0 => New Moon
  // 1 => Waxing Crescent Moon
  // 2 => Quarter Moon
  // 3 => Waxing Gibbous Moon
  // 4 => Full Moon
  // 5 => Waning Gibbous Moon
  // 6 => Last Quarter Moon
  // 7 => Waning Crescent Moon

  return b;
}

export function mapPhaseToString(phaseNum) {
  if (phaseNum === 0) return "New Moon";
  if (phaseNum === 1) return "Waxing Crescent Moon";
  if (phaseNum === 2) return "Quarter Moon";
  if (phaseNum === 3) return "Waxing Gibbous Moon";
  if (phaseNum === 4) return "Full Moon";
  if (phaseNum === 5) return "Waning Gibbous Moon";
  if (phaseNum === 6) return "Last Quarter Moon";
  if (phaseNum === 7) return "Waning Crescent Moon";
}

export function mapToPhase(phaseNum) {
  let percentage = phaseNum / 7;
  return 24 - 24 * percentage;
}

export function dateStringPlus(date) {
  date = new Date(date);
  let numsOfDayToAdd = 2; // he have to add 2 days because `date` starts at hour 00
  date.setDate(date.getDate() + numsOfDayToAdd);

  let dd = date.getDate();
  dd = dd <= 9 ? "0" + dd : dd;
  let mm = date.getMonth() + 1;
  mm = mm <= 9 ? "0" + mm : mm;
  let y = date.getFullYear();

  return y + "-" + mm + "-" + dd;
}
