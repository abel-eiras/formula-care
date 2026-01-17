import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Ene", dermo: 12, bio: 8 },
  { month: "Feb", dermo: 19, bio: 12 },
  { month: "Mar", dermo: 15, bio: 10 },
  { month: "Abr", dermo: 25, bio: 18 },
  { month: "May", dermo: 22, bio: 15 },
  { month: "Jun", dermo: 30, bio: 22 },
];

export function EvolutionChart() {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Evolución de Servicios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="dermo" 
                name="Dermocosmética"
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="bio" 
                name="Bioquímica"
                stroke="hsl(var(--secondary))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
