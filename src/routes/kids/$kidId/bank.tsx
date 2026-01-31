import { createFileRoute } from '@tanstack/react-router'
import { getBalance, getTransactions } from '@/server/bank'

export const Route = createFileRoute('/kids/$kidId/bank')({
  loader: async ({ params }) => {
    const [balance, transactions] = await Promise.all([
      getBalance({ data: { kidId: params.kidId } }),
      getTransactions({ data: { kidId: params.kidId } }),
    ])
    return { balance, transactions }
  },
  component: KidBankPage,
})

function KidBankPage() {
  const { balance, transactions } = Route.useLoaderData()

  const totalEarned = balance.choreEarnings + balance.jobEarnings + balance.allowanceEarnings

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Bank</h2>
        <p className="text-gray-600">Track your earnings and savings!</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Current Balance</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            ${balance.balance.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Earned (All Time)</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            ${totalEarned.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-purple-50 p-4 text-center">
          <p className="text-sm text-purple-700">From Chores</p>
          <p className="text-xl font-bold text-purple-600">
            ${balance.choreEarnings.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 p-4 text-center">
          <p className="text-sm text-orange-700">From Jobs</p>
          <p className="text-xl font-bold text-orange-600">
            ${balance.jobEarnings.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 text-center">
          <p className="text-sm text-green-700">Allowance</p>
          <p className="text-xl font-bold text-green-600">
            ${balance.allowanceEarnings.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-700">Paid Out</p>
          <p className="text-xl font-bold text-gray-600">
            ${balance.totalPayouts.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b pb-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                      t.type === 'chore'
                        ? 'bg-purple-100 text-purple-600'
                        : t.type === 'job'
                          ? 'bg-orange-100 text-orange-600'
                          : t.type === 'allowance'
                            ? 'bg-green-100 text-green-600'
                            : t.type === 'adjustment'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t.type === 'chore' ? '✓' : t.type === 'job' ? '★' : t.type === 'allowance' ? '♦' : t.type === 'adjustment' ? '±' : '$'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{t.description}</p>
                    {t.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <p
                  className={`font-bold ${
                    t.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
