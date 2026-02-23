import React from 'react';
import Card from '../components/Card';

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card href="/host/list" title="Host" description="Show list of host" />
        <Card href="/service/list" title="Deployd Service" description="Show list of service" />
        <Card href="/repository/list" title="Artifactd Repository" description="Show list of repository" />
      </div>
    </div>
  );
}
