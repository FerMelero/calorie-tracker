import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import type { AxisLabel } from '@/components/bar-chart';
import { Accent } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/serving';
import { lineLayout } from '@/lib/chart';

/** Un valor en la columna `index` (0 = primer día del periodo). */
export type LinePoint = { index: number; value: number };

type Props = {
  /** Cuántos días tiene el periodo (el mismo número de columnas que la gráfica de barras) */
  total: number;
  points: LinePoint[];
  /** Línea de tendencia (media móvil); opcional */
  trend?: LinePoint[];
  min: number;
  max: number;
  xLabels: AxisLabel[];
  height?: number;
  accessibilityLabel: string;
};

const LEFT = 38;
const RIGHT = 6;
const TOP = 8;
const BOTTOM = 22;

/** Pesos como puntos y su tendencia como línea. Las columnas coinciden con las de BarChart. */
export function LineChart({ total, points, trend = [], min, max, xLabels, height = 170, accessibilityLabel }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const layout = lineLayout(total, points, trend, min, max, { width, height }, { left: LEFT, right: RIGHT, top: TOP, bottom: BOTTOM });

  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {layout.grid.map((g) => (
            <Line key={g.value} x1={LEFT} x2={width - RIGHT} y1={g.y} y2={g.y} stroke={theme.backgroundSelected} strokeWidth={1} />
          ))}
          {layout.grid.map((g) => (
            <SvgText key={`t${g.value}`} x={LEFT - 6} y={g.y + 4} fontSize={10} fill={theme.textSecondary} textAnchor="end">
              {formatNumber(g.value, 1)}
            </SvgText>
          ))}

          {layout.path ? <Path d={layout.path} stroke={Accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
          {layout.dots.map((d) => (
            <Circle key={d.index} cx={d.x} cy={d.y} r={3.2} fill={theme.backgroundElement} stroke={Accent} strokeWidth={2} />
          ))}

          {xLabels.map((l, k) => {
            const anchor = k === 0 ? 'start' : k === xLabels.length - 1 ? 'end' : 'middle';
            return (
              <SvgText key={l.index} x={layout.x(l.index)} y={height - 6} fontSize={10} fill={theme.textSecondary} textAnchor={anchor}>
                {l.text}
              </SvgText>
            );
          })}
        </Svg>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ placeholder: { flex: 1 } });
