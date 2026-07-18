const { validateName, getShanghaiTime } = require('./server');

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  function assertTrue(value, message) {
    if (!value) {
      throw new Error(`${message}: expected true, got false`);
    }
  }

  function assertFalse(value, message) {
    if (value) {
      throw new Error(`${message}: expected false, got true`);
    }
  }

  console.log('\n=== Running validateName Tests ===\n');

  test('valid name should pass validation', () => {
    const result = validateName('张三');
    assertTrue(result.valid, 'valid');
    assertEqual(result.name, '张三', 'name');
  });

  test('empty name should fail', () => {
    const result = validateName('');
    assertFalse(result.valid, 'valid');
    assertEqual(result.message, '姓名不能为空', 'message');
  });

  test('whitespace only name should fail', () => {
    const result = validateName('   ');
    assertFalse(result.valid, 'valid');
    assertEqual(result.message, '姓名不能为空', 'message');
  });

  test('null name should fail', () => {
    const result = validateName(null);
    assertFalse(result.valid, 'valid');
  });

  test('undefined name should fail', () => {
    const result = validateName(undefined);
    assertFalse(result.valid, 'valid');
  });

  test('name exceeding 50 characters should fail', () => {
    const longName = 'a'.repeat(51);
    const result = validateName(longName);
    assertFalse(result.valid, 'valid');
    assertEqual(result.message, '姓名不能超过50个字符', 'message');
  });

  test('name with exactly 50 characters should pass', () => {
    const longName = 'a'.repeat(50);
    const result = validateName(longName);
    assertTrue(result.valid, 'valid');
  });

  test('name with XSS characters should fail', () => {
    const result = validateName('<script>alert(1)</script>');
    assertFalse(result.valid, 'valid');
    assertEqual(result.message, '姓名包含非法字符', 'message');
  });

  test('name with quote should fail', () => {
    const result = validateName('张三"');
    assertFalse(result.valid, 'valid');
    assertEqual(result.message, '姓名包含非法字符', 'message');
  });

  test('name with backslash should fail', () => {
    const result = validateName('张三\\');
    assertFalse(result.valid, 'valid');
    assertEqual(result.message, '姓名包含非法字符', 'message');
  });

  test('name with leading/trailing whitespace should be trimmed', () => {
    const result = validateName('  张三  ');
    assertTrue(result.valid, 'valid');
    assertEqual(result.name, '张三', 'name');
  });

  console.log('\n=== Running getShanghaiTime Tests ===\n');

  test('getShanghaiTime returns correct format', () => {
    const time = getShanghaiTime();
    const pattern = /^\d{4}年\d{2}月\d{2}日 \d{2}:\d{2}:\d{2}$/;
    assertTrue(pattern.test(time), `time format: ${time}`);
  });

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
