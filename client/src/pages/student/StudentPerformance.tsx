import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { studentsApi } from '../../lib/api'
import { formatDate, calculatePerformance } from '../../lib/utils'
import { BarChart2, TrendingUp } from 'lucide-react'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'

export default function StudentPerformance() {
  const { user } = useAuth()
  const studentId = user?.profile?.id

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ['student-scores', studentId],
    queryFn: () => studentsApi.getScores(studentId!).then(r => r.data),
    enabled: !!studentId,
  })

  const perf = useMemo(() => calculatePerformance(scores), [scores])

  const categoryGroups = useMemo(() => {
    return scores.reduce((acc: any, s: any) => {
      const cat = s.activity?.category || 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(s)
      return acc
    }, {})
  }, [scores])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Academic Performance</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          Your classroom activity scores and performance statistics
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-poppins font-bold text-primary">{perf.percentage}%</p>
          <p className="text-text-secondary font-inter text-sm mt-1">Overall Score</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-poppins font-bold text-info">{perf.completed}</p>
          <p className="text-text-secondary font-inter text-sm mt-1">Completed</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-poppins font-bold text-success">{perf.totalEarned}</p>
          <p className="text-text-secondary font-inter text-sm mt-1">Score Earned</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-poppins font-bold text-text-secondary">{perf.totalPossible}</p>
          <p className="text-text-secondary font-inter text-sm mt-1">Total Possible</p>
        </div>
      </div>

      {scores.length === 0 ? (
        <EmptyState
          title="No Activity Scores Yet"
          description="Your teacher will record your scores for quizzes, assignments, exams, and other activities."
          icon={<BarChart2 className="w-8 h-8 text-primary" />}
        />
      ) : (
        <>
          {/* By category */}
          {Object.entries(categoryGroups).map(([category, items]: any) => {
            const catPerf = calculatePerformance(items)
            return (
              <div key={category} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-heading capitalize">{category}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${catPerf.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-poppins font-semibold text-primary">
                      {catPerf.percentage}%
                    </span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Score</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s: any) => {
                        const pct = s.totalScore > 0 ? Math.round((s.scoreObtained / s.totalScore) * 100) : 0
                        return (
                          <tr key={s.id}>
                            <td className="font-medium">{s.activity?.title}</td>
                            <td>{s.activity?.subject?.name}</td>
                            <td className="text-text-secondary">{formatDate(s.activity?.activityDate)}</td>
                            <td>
                              <span className="font-poppins font-semibold">{s.scoreObtained}</span>
                              <span className="text-text-secondary">/{s.totalScore}</span>
                            </td>
                            <td>
                              <span className={`font-semibold ${pct >= 75 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger'}`}>
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
