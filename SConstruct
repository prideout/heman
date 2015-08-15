import os.path

BUILD_DIR = 'build'

DEMO_NAME = 'demo_heman'
TEST_NAME = 'test_heman'

TEST_BIN = os.path.join(BUILD_DIR, TEST_NAME)
DEMO_BIN = os.path.join(BUILD_DIR, DEMO_NAME)

Export('TEST_NAME DEMO_NAME')

# Building Targets

SConscript('SConscript', variant_dir=BUILD_DIR, src_dir='.', duplicate=0)

# Executing Tests

Command('test', TEST_BIN, TEST_BIN)
AlwaysBuild('test')

Command('demo', DEMO_BIN, DEMO_BIN)
AlwaysBuild('demo')

# Code Formatting

additions = ['include/heman.h'] + Glob('test/*.c')
exclusions = Glob('src/noise.*')
cfiles = Glob('src/*.c') + Glob('src/*.h') + additions
cfiles = list(set(cfiles) - set(exclusions))
Command('format', cfiles, 'clang-format-3.6 -i $SOURCES && ' +
        'uncrustify -c uncrustify.cfg --no-backup $SOURCES')
AlwaysBuild('format')
