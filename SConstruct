SConscript('SConscript', variant_dir='build', src_dir='.', duplicate=0)

TEST_BIN = 'build/test_heman'

Default(TEST_BIN)
Command('test', TEST_BIN, TEST_BIN)
AlwaysBuild('test')

Alias('lib', 'build/_heman.so')

additions = ['include/heman.h', 'test/main.c']
exclusions = Glob('src/noise.*')
cfiles = Glob('src/*.c') + Glob('src/*.h') + additions
cfiles = list(set(cfiles) - set(exclusions))
Command('format', cfiles, 'clang-format-3.6 -i $SOURCES')
AlwaysBuild('format')
