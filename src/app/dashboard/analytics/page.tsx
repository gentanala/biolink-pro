'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
    BarChart3,
    TrendingUp,
    Users,
    MousePointer2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Loader2,
    Eye,
    MessageSquare
} from 'lucide-react'

export default function AnalyticsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalViews: 0,
        totalClicks: 0,
        totalLeads: 0,
        uniqueVisitors: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [recentLeads, setRecentLeads] = useState<any[]>([])
    const [dateRange, setDateRange] = useState('30d') // 7d, 30d, 90d

    useEffect(() => {
        fetchAnalytics()
    }, [dateRange])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!profile) return

            // 1. Fetch Stats
            const { data: analyticsData } = await supabase
                .rpc('get_analytics_summary', {
                    p_profile_id: profile.id,
                    p_days: parseInt(dateRange)
                })

            const { count: leadsCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('profile_id', profile.id)

            if (analyticsData && analyticsData.length > 0) {
                setStats({
                    totalViews: analyticsData[0].total_views || 0,
                    totalClicks: analyticsData[0].total_clicks || 0,
                    totalLeads: leadsCount || 0,
                    uniqueVisitors: analyticsData[0].unique_days || 0
                })
            }

            // 2. Fetch Chart Data (Daily Views/Clicks)
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(endDate.getDate() - parseInt(dateRange))

            const { data: dailyData } = await supabase
                .from('analytics')
                .select('created_at, event_type')
                .eq('profile_id', profile.id)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true })

            // Process daily data
            const days = new Map()
            if (dailyData) {
                dailyData.forEach((item: any) => {
                    const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    if (!days.has(date)) {
                        days.set(date, { date, views: 0, clicks: 0 })
                    }
                    const dayStats = days.get(date)
                    if (item.event_type === 'view') dayStats.views++
                    if (item.event_type === 'click') dayStats.clicks++
                })
            }
            // Fill in missing days
            const chart = []
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                if (days.has(dateStr)) {
                    chart.push(days.get(dateStr))
                } else {
                    chart.push({ date: dateStr, views: 0, clicks: 0 })
                }
            }
            setChartData(chart)

            // 3. Fetch Recent Leads
            const { data: leads } = await supabase
                .from('leads')
                .select('*')
                .eq('profile_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(10)

            setRecentLeads(leads || [])

        } catch (err) {
            console.error('Error fetching analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    const exportLeads = async () => {
        // Implementation for CSV export
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Name,Email,WhatsApp,Company,Date\n"
            + recentLeads.map(l =>
                `"${l.name || ''}","${l.email || ''}","${l.whatsapp || ''}","${l.company || ''}","${new Date(l.created_at).toLocaleDateString()}"`
            ).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "leads_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-900 mb-2">Analytics</h1>
                    <p className="text-zinc-500">Track your profile performance and leads</p>
                </div>
                <div className="flex bg-white rounded-lg p-1 border border-zinc-200">
                    {['7d', '30d', '90d'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${dateRange === range
                                    ? 'bg-zinc-900 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-900'
                                }`}
                        >
                            Last {range.replace('d', ' Days')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard
                            title="Total Views"
                            value={stats.totalViews}
                            icon={<Eye className="w-5 h-5 text-blue-500" />}
                            trend="+12%"
                            trendUp={true}
                        />
                        <StatsCard
                            title="Link Clicks"
                            value={stats.totalClicks}
                            icon={<MousePointer2 className="w-5 h-5 text-purple-500" />}
                            trend="+5%"
                            trendUp={true}
                        />
                        <StatsCard
                            title="Total Leads"
                            value={stats.totalLeads}
                            icon={<Users className="w-5 h-5 text-emerald-500" />}
                            trend="+24%"
                            trendUp={true}
                        />
                        <StatsCard
                            title="CTR"
                            value={`${stats.totalViews > 0 ? ((stats.totalClicks / stats.totalViews) * 100).toFixed(1) : 0}%`}
                            icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
                            trend="-2%"
                            trendUp={false}
                        />
                    </div>

                    {/* Chart Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Chart */}
                        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-semibold text-zinc-900">Traffic Overview</h3>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                        <span className="text-zinc-500">Views</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                                        <span className="text-zinc-500">Clicks</span>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Bar Chart using Framer Motion */}
                            <div className="h-64 flex items-end gap-2">
                                {chartData.map((item, i) => {
                                    const maxVal = Math.max(...chartData.map(d => Math.max(d.views, d.clicks, 10)))
                                    const viewHeight = (item.views / maxVal) * 100
                                    const clickHeight = (item.clicks / maxVal) * 100

                                    return (
                                        <div key={i} className="flex-1 flex flex-col justify-end gap-1 group relative h-full">
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                                {item.date}: {item.views} views, {item.clicks} clicks
                                            </div>

                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${viewHeight}%` }}
                                                className="w-full bg-blue-100 rounded-t-sm group-hover:bg-blue-200 transition-colors relative"
                                            >
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${clickHeight}%` }}
                                                    className="absolute bottom-0 left-0 right-0 bg-purple-400/50 rounded-t-sm"
                                                />
                                            </motion.div>

                                            {/* X-Axis Label (show every 5th label on small screens) */}
                                            {i % 5 === 0 && (
                                                <span className="text-[10px] text-zinc-400 absolute top-full mt-2 w-max -translate-x-1/2 left-1/2">
                                                    {item.date}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Recent Leads */}
                        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-semibold text-zinc-900">Recent Leads</h3>
                                <button onClick={exportLeads} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 transition-colors" title="Export CSV">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                {recentLeads.length > 0 ? (
                                    recentLeads.map((lead) => (
                                        <div key={lead.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <span className="font-bold text-emerald-600">
                                                    {(lead.name || 'L')[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-zinc-900 truncate">{lead.name || 'Anonymous'}</p>
                                                <p className="text-xs text-zinc-500 truncate">{lead.email || lead.whatsapp}</p>
                                                {lead.company && (
                                                    <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wide">{lead.company}</p>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                                        <MessageSquare className="w-8 h-8 opacity-20" />
                                        <p className="text-sm">No leads yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function StatsCard({ title, value, icon, trend, trendUp }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-zinc-50 rounded-xl">
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
            <div>
                <p className="text-sm text-zinc-500 font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-zinc-900 mt-1">{value}</h3>
            </div>
        </motion.div>
    )
}
