import os.path

TEST_NAME = 'test_heman'
BUILD_DIR = 'build'
TEST_BIN = os.path.join(BUILD_DIR, TEST_NAME)

Export('TEST_NAME')

# Building Targets
SConscript('SConscript', variant_dir=BUILD_DIR, src_dir='.', duplicate=0)

# Executing Tests
Command('test', TEST_BIN, TEST_BIN)
AlwaysBuild('test')

# Code Formatting
additions = ['include/heman.h'] + Glob('test/*.c')
exclusions = Glob('src/noise.*')
cfiles = Glob('src/*.c') + Glob('src/*.h') + additions
cfiles = list(set(cfiles) - set(exclusions))
Command('format', cfiles, 'clang-format-3.6 -i $SOURCES')
AlwaysBuild('format')
