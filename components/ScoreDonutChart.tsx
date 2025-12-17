import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface ScoreDonutChartProps {
  score: number;
  theme: 'light' | 'dark';
}

export const ScoreDonutChart: React.FC<ScoreDonutChartProps> = ({ score, theme }) => {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  const color = theme === 'dark' ? '#d1d5db' : '#1f2937'; // gray-300 vs gray-800
  const remainingColor = theme === 'dark' ? '#374151' : '#f3f4f6'; // gray-700 vs gray-100

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={450}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill={remainingColor} />
            <Label
              value={`${score}%`}
              position="center"
              fill={color}
              className="text-4xl font-bold"
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};