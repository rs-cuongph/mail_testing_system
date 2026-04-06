const { ImapFlow } = require('imapflow');

async function test() {
  const client = new ImapFlow({
    host: 'mail.runsystem.work',
    port: 993,
    secure: true,
    auth: {
      user: 'gens@runsystem.work',
      pass: 'BzQq~;qp-f,fF|0'
    },
    logger: false
  });

  await client.connect();
  let lock = await client.getMailboxLock('INBOX');
  try {
    let list = await client.search({ seen: false }, { uid: true });
    console.log('Unseen messages:', list);
    
    // Total messages
    let status = await client.status('INBOX', { messages: true });
    console.log('Total messages:', status.messages);
  } finally {
    lock.release();
  }
  await client.logout();
}

test().catch(console.error);
