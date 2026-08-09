-- Repair UTF-8 text that was previously interpreted as Latin-1 during import.
update public.market_players set
  full_name = case when full_name ~ '[ÃÂ]' then convert_from(convert_to(full_name, 'LATIN1'), 'UTF8') else full_name end,
  display_name = case when display_name ~ '[ÃÂ]' then convert_from(convert_to(display_name, 'LATIN1'), 'UTF8') else display_name end,
  nationality = case when nationality ~ '[ÃÂ]' then convert_from(convert_to(nationality, 'LATIN1'), 'UTF8') else nationality end,
  updated_at = now()
where full_name ~ '[ÃÂ]' or display_name ~ '[ÃÂ]' or nationality ~ '[ÃÂ]';

update public.market_clubs set
  name = case when name ~ '[ÃÂ]' then convert_from(convert_to(name, 'LATIN1'), 'UTF8') else name end,
  short_name = case when short_name ~ '[ÃÂ]' then convert_from(convert_to(short_name, 'LATIN1'), 'UTF8') else short_name end,
  updated_at = now()
where name ~ '[ÃÂ]' or short_name ~ '[ÃÂ]';
