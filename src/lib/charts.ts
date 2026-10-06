// Chart.js, set up once: Flexo light, thin marks, recessive grid, the theme's colours
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { moneyShort } from './format'

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

export function colors() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    income: v('--income'),
    expense: v('--expense'),
    grid: v('--chart-grid'),
    text: v('--chart-text'),
    surface: v('--chart-tooltip'),
    ink: v('--foreground'),
  }
}

export function baseOptions(c = colors()) {
  Chart.defaults.font.family = 'Flexo, system-ui, sans-serif'
  Chart.defaults.font.weight = 100
  Chart.defaults.color = c.text
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, boxHeight: 10, padding: 16, color: c.text },
      },
      tooltip: {
        backgroundColor: c.surface,
        titleColor: c.ink,
        bodyColor: c.ink,
        borderColor: c.grid,
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: { weight: 100 as const },
        bodyFont: { weight: 100 as const },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { color: c.grid }, ticks: { color: c.text, maxRotation: 0, autoSkipPadding: 12 } },
      y: {
        beginAtZero: true,
        grid: { color: c.grid },
        border: { display: false },
        ticks: { color: c.text, maxTicksLimit: 5, callback: (value: string | number) => moneyShort(Number(value)) },
      },
    },
  }
}
