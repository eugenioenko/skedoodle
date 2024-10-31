import { useConfigStore } from "@/stores/config.store";

const themeNames = [
  ["theme-light", "Light"],
  ["theme-dark", "Dark"],
  ["theme-high-contrast-light", "High Contrast Light"],
  ["theme-high-contrast-dark", "Hight Contrast Dark"],
  ["theme-urban-light", "Urban Light"],
  ["theme-urban-dark", "Urban Dark"],
  ["theme-rainy-day", "Rainy Day Light"],
  ["theme-woodland-trail", "Woodland Trail Light"],
  ["theme-detroit-dark", "Detroit Dark"],
  ["theme-twilight-light", "Twilight Light"],
  ["theme-twilight-dark", "Twilight Dark"],
  ["theme-bohemia-dark", "Bohemia Dark"],
  ["theme-sunset", "Sunset Light"],
  ["theme-ocean-breeze", "Ocean Breeze Light"],
  ["theme-mountain-peak", "Mountain Peak Light"],
  ["theme-golden-hour", "Golden Hour Dark"],
  ["theme-moonlit-sky", "Moonlit Sky Light"],
];
export const ThemeSelector = () => {
  const configState = useConfigStore();

  const setTheme = (theme: string) => {
    document.body.className = theme;
    configState.setTheme(theme);
  };

  return (
    <select
      value={configState.theme || undefined}
      onChange={(e) => setTheme(e.currentTarget.value)}
    >
      <option value={undefined}>Select theme</option>
      {themeNames.map((theme) => (
        <option key={theme[0]} value={theme[0]}>
          {theme[1]}
        </option>
      ))}
    </select>
  );
};
