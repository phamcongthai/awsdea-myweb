import {defineConfig} from 'vitest/config';
export default defineConfig({resolve:{preserveSymlinks:true},test:{include:['tests/data.test.mjs'],pool:'forks'}});
