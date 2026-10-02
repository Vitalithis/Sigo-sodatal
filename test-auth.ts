import { config } from 'dotenv';
config({ path: '.env.local' });
import { auth } from './src/lib/auth';

async function main() {
  const result = await auth.api.signInEmail({
    body: {
      email: 'docampo@ing.ucsc.cl',
      password: 'admin1234'
    }
  });
  console.log(result);
}

main().catch(console.error);
