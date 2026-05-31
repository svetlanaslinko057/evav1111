import React, { useState, useEffect } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Zap, Award, Medal } from 'lucide-react';
import { runtime } from '@/runtime';

/**
 * LEADERBOARD - Конкуренция между разработчиками
 * Dark theme, без emoji, с защитой от пустых данных
 */

export default function DeveloperLeaderboard() {
  const { tByEn } = useLang();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    quality: [],
    earnings: [],
    speed: [],
    my_rank: {
      quality: null,
      earnings: null,
      speed: null
    }
  });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const empty = { quality: [], earnings: [], speed: [], my_rank: { quality: null, earnings: null, speed: null } };
    try {
      // WEB-P3.3: migrated from raw fetch → runtime singleton.
      const { data: result } = await runtime.get('/api/developer/economy/leaderboard');
      setData({
        quality: result.quality || [],
        earnings: result.earnings || [],
        speed: result.speed || [],
        my_rank: result.my_rank || empty.my_rank,
      });
      setLoading(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch leaderboard:', err);
      setData(empty);
      setLoading(false);
    }
  };

  const renderLeaderboard = (list, type, icon) => {
    if (!list || list.length === 0) {
      return (
        <div className="p-12 text-center border border-dashed border-border rounded-xl bg-muted">
          <p className="text-muted-foreground">{tByEn('No leaderboard data available yet')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3" data-testid={`leaderboard-${type}`}>
        {list.map((entry, idx) => {
          const isMe = entry.is_me;
          const rank = idx + 1;
          
          return (
            <div
              key={entry.user_id}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                isMe 
                  ? 'bg-[color:var(--info-surface)] border-[color:var(--info-border)]' 
                  : 'bg-card border-border hover:border-muted-foreground'
              }`}
              data-testid={`leaderboard-entry-${rank}`}
            >
              {/* Left rail для top 3 */}
              {rank <= 3 && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                  rank === 1 ? 'bg-signal/15' :
                  rank === 2 ? 'bg-signal/15' :
                  'bg-signal/15'
                }`}></div>
              )}

              <div className="flex items-center gap-4">
                {/* Rank Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                  rank === 1 ? 'bg-muted border-2 border-foreground/50 text-foreground' :
                  rank === 2 ? 'bg-muted border-2 border-foreground/30 text-foreground' :
                  rank === 3 ? 'bg-muted border border-foreground/20 text-foreground' :
                  'bg-muted border border-border text-muted-foreground'
                }`}>
                  {rank <= 3 ? (
                    <Medal className="w-6 h-6" />
                  ) : (
                    `#${rank}`
                  )}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className={`font-semibold flex items-center gap-2 ${isMe ? "text-[color:var(--info)]" : "text-foreground"}`}>
                    {entry.name || entry.user_id}
                    {isMe && <Badge className="bg-[color:var(--info)] text-info-ink border-0">{tByEn('You')}</Badge>}
                  </p>
                  <p className="text-sm text-muted-foreground">{entry.level || 'Developer'}</p>
                </div>

                {/* Value */}
                <div className="text-right">
                  <p className={`text-2xl font-bold font-mono ${
                    isMe ? "text-[color:var(--info)]" : "text-foreground"
                  }`}>
                    {type === 'earnings' && '$'}
                    {entry.value}
                    {type === 'quality' && '%'}
                    {type === 'speed' && 'x'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="leaderboard-page">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-foreground" />
            {tByEn('Leaderboard')}
          </h1>
          <p className="text-muted-foreground mt-2">{tByEn('Top developers in the platform')}</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="quality" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card border border-border p-1">
            <TabsTrigger 
              value="quality" 
              data-testid="tab-quality"
              className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground"
            >
              <Award className="w-4 h-4 mr-2" />
              {tByEn('Quality')}
            </TabsTrigger>
            <TabsTrigger 
              value="earnings" 
              data-testid="tab-earnings"
              className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {tByEn('Earnings')}
            </TabsTrigger>
            <TabsTrigger 
              value="speed" 
              data-testid="tab-speed"
              className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground"
            >
              <Zap className="w-4 h-4 mr-2" />
              {tByEn('Speed')}
            </TabsTrigger>
          </TabsList>

          {/* Quality Tab */}
          <TabsContent value="quality" className="mt-6">
            <Card className="bg-card border border-border shadow-[var(--shadow-elev-1)]">
              <CardHeader>
                <CardTitle className="text-foreground">{tByEn('Top Quality Performers')}</CardTitle>
                <p className="text-sm text-muted-foreground">{tByEn('Based on QA pass rate')}</p>
              </CardHeader>
              <CardContent>
                {renderLeaderboard(data.quality, 'quality', Award)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="mt-6">
            <Card className="bg-card border border-border shadow-[var(--shadow-elev-1)]">
              <CardHeader>
                <CardTitle className="text-foreground">{tByEn('Top Earners')}</CardTitle>
                <p className="text-sm text-muted-foreground">{tByEn('Total earnings this month')}</p>
              </CardHeader>
              <CardContent>
                {renderLeaderboard(data.earnings, 'earnings', TrendingUp)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Speed Tab */}
          <TabsContent value="speed" className="mt-6">
            <Card className="bg-card border border-border shadow-[var(--shadow-elev-1)]">
              <CardHeader>
                <CardTitle className="text-foreground">{tByEn('Fastest Developers')}</CardTitle>
                <p className="text-sm text-muted-foreground">{tByEn('Average delivery speed')}</p>
              </CardHeader>
              <CardContent>
                {renderLeaderboard(data.speed, 'speed', Zap)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* My Rank Summary */}
        {data.my_rank && (
          <Card className="border-2 border-[color:var(--info-border)] bg-[color:var(--info-surface)] shadow-[var(--shadow-elev-1)]">
            <CardHeader>
              <CardTitle className="text-[color:var(--info)]">{tByEn('Your Rankings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <Award className="w-6 h-6 mx-auto mb-2 text-[color:var(--info)]" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">{tByEn('Quality Rank')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {data.my_rank.quality ? `#${data.my_rank.quality}` : 'N/A'}
                  </p>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-[color:var(--success)]" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">{tByEn('Earnings Rank')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {data.my_rank.earnings ? `#${data.my_rank.earnings}` : 'N/A'}
                  </p>
                </div>
                <div className="text-center p-4 bg-card rounded-lg border border-border">
                  <Zap className="w-6 h-6 mx-auto mb-2 text-[color:var(--warning)]" />
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">{tByEn('Speed Rank')}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {data.my_rank.speed ? `#${data.my_rank.speed}` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
