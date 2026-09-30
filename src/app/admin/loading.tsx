import React from 'react';

export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* Header Banner Skeleton */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-slate-200 rounded-lg" />
            <div className="w-72 h-4 bg-slate-100 rounded-lg" />
          </div>
        </div>
        <div className="w-28 h-9 bg-slate-100 rounded-xl" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="w-24 h-3 bg-slate-200 rounded" />
            <div className="w-16 h-7 bg-slate-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Table / Box Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="w-36 h-5 bg-slate-200 rounded-lg" />
          <div className="w-28 h-8 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="w-full h-12 bg-slate-50 rounded-xl border border-slate-100/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
