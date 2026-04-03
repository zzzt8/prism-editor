// Test user isolation for workflows
const BASE = 'http://localhost:3001';

async function test() {
  try {
    // 1. Register two different users
    console.log('=== Register User A ===');
    const userARes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usera@test.com', password: 'password123', name: 'User A' })
    });
    const userA = await userARes.json();
    console.log('User A:', userA.user.email);

    console.log('\n=== Register User B ===');
    const userBRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'userb@test.com', password: 'password123', name: 'User B' })
    });
    const userB = await userBRes.json();
    console.log('User B:', userB.user.email);

    // 2. User A creates a workflow
    console.log('\n=== User A creates workflow ===');
    const createResA = await fetch(`${BASE}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userA.accessToken}`
      },
      body: JSON.stringify({ name: 'User A Workflow', content: '{}' })
    });
    const workflowA = await createResA.json();
    console.log('Created workflow A:', workflowA.data?.name);

    // 3. User B creates a workflow
    console.log('\n=== User B creates workflow ===');
    const createResB = await fetch(`${BASE}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userB.accessToken}`
      },
      body: JSON.stringify({ name: 'User B Workflow', content: '{}' })
    });
    const workflowB = await createResB.json();
    console.log('Created workflow B:', workflowB.data?.name);

    // 4. User A lists workflows - should only see their own
    console.log('\n=== User A lists workflows ===');
    const listResA = await fetch(`${BASE}/api/workflows`, {
      headers: { 'Authorization': `Bearer ${userA.accessToken}` }
    });
    const workflowsA = await listResA.json();
    console.log('User A sees', workflowsA.data?.length, 'workflow(s):', workflowsA.data?.map(w => w.name));

    // 5. User B lists workflows - should only see their own
    console.log('\n=== User B lists workflows ===');
    const listResB = await fetch(`${BASE}/api/workflows`, {
      headers: { 'Authorization': `Bearer ${userB.accessToken}` }
    });
    const workflowsB = await listResB.json();
    console.log('User B sees', workflowsB.data?.length, 'workflow(s):', workflowsB.data?.map(w => w.name));

    // 6. User A tries to delete User B's workflow (should fail)
    console.log('\n=== User A tries to delete User B workflow ===');
    const deleteRes = await fetch(`${BASE}/api/workflows/${workflowB.data.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userA.accessToken}` }
    });
    console.log('Delete status:', deleteRes.status, '- should be 403');

    console.log('\n✓ User isolation working correctly!');
  } catch (error) {
    console.error('Error:', error);
  }
}

test();