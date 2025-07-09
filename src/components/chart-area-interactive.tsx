"use client"

import * as React from "react"
import { httpsCallable } from "firebase/functions"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { functions } from "@/firebase/clients"
import { useAuth } from "@/contexts/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { AlertCircle as FiAlertCircle, Loader2 as FiLoader } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description =
  "Ein interaktiver Flächenchart, der den Gesamtumsatz anzeigt"

// Typ für die Rohdaten, die wir von der Funktion erwarten
type OrderData = {
  id: string
  orderDate?: { _seconds: number; _nanoseconds: number } | string
  totalAmountPaidByBuyer: number
  status: string
}

const chartConfig = {
  umsatz: {
    label: "Umsatz",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ companyUid }: { companyUid: string }) {
  const isMobile = useIsMobile()
  const { user, loading: authLoading } = useAuth()
  const [timeRange, setTimeRange] = React.useState("90d")
  const [orders, setOrders] = React.useState<OrderData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  React.useEffect(() => {
    if (authLoading || !user || !companyUid) {
      return
    }

    const fetchOrders = async () => {
      setLoading(true)
      setError(null)
      try {
        const getProviderOrders = httpsCallable<
          { providerId: string },
          { orders: OrderData[] }
        >(functions, "getProviderOrders")
        const result = await getProviderOrders({ providerId: companyUid })
        setOrders(result.data.orders || [])
      } catch (err: any) {
        console.error("Fehler beim Laden der Aufträge für den Chart:", err)
        setError(
          err.message || "Die Umsatzdaten konnten nicht geladen werden."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [companyUid, user, authLoading])

  const { chartData, totalRevenue } = React.useMemo(() => {
    if (!orders.length) return { chartData: [], totalRevenue: 0 }

    const referenceDate = new Date()
    let daysToSubtract = 90
    if (timeRange === "30d") daysToSubtract = 30
    else if (timeRange === "7d") daysToSubtract = 7
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)

    const dailyRevenue: { [key: string]: number } = {}
    let currentTotalRevenue = 0

    orders.forEach((order) => {
      if (
        !order.orderDate ||
        !["ABGESCHLOSSEN", "BEZAHLT"].includes(order.status)
      ) {
        return
      }

      const orderDate = new Date(
        typeof order.orderDate === "string"
          ? order.orderDate
          : order.orderDate._seconds * 1000
      )

      if (orderDate >= startDate) {
        const dateString = orderDate.toISOString().split("T")[0] // YYYY-MM-DD
        if (!dailyRevenue[dateString]) {
          dailyRevenue[dateString] = 0
        }
        dailyRevenue[dateString] += order.totalAmountPaidByBuyer / 100 // In Euro umrechnen
        currentTotalRevenue += order.totalAmountPaidByBuyer / 100
      }
    })

    const finalChartData = Object.keys(dailyRevenue)
      .map((date) => ({
        date,
        umsatz: dailyRevenue[date],
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return { chartData: finalChartData, totalRevenue: currentTotalRevenue }
  }, [orders, timeRange])

  if (loading) {
    return (
      <Card className="flex h-[350px] w-full items-center justify-center">
        <FiLoader className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="flex h-[350px] w-full flex-col items-center justify-center">
        <FiAlertCircle className="mb-2 h-8 w-8 text-destructive" />
        <p className="text-destructive">{error}</p>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Gesamtumsatz</CardTitle>
        <CardDescription>
          Gesamtumsatz für den ausgewählten Zeitraum:{" "}
          <span className="font-bold">{totalRevenue.toFixed(2)} €</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Letzte 3 Monate</ToggleGroupItem>
            <ToggleGroupItem value="30d">Letzte 30 Tage</ToggleGroupItem>
            <ToggleGroupItem value="7d">Letzte 7 Tage</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Letzte 3 Monate" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Letzte 3 Monate
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Letzte 30 Tage
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Letzte 7 Tage
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillUmsatz" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-umsatz)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-umsatz)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value + "T00:00:00") // Verhindert Zeitzonenprobleme
                return date.toLocaleDateString("de-DE", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : chartData.length - 1}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value + "T00:00:00").toLocaleDateString("de-DE", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  }
                  formatter={(value) => `${Number(value).toFixed(2)} €`}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="umsatz"
              type="natural"
              fill="url(#fillUmsatz)"
              stroke="var(--color-umsatz)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
