import os.path

TESTS = Split('heman earth sdf planet pts')

BUILD_DIR = 'build'

AddOption('--double',
          dest='double',
          action='store_true',
          help='use 64-bit floats')

AddOption('--javascript',
          dest='javascript',
          action='store_true',
          help='build with emcc')

# Targets that build code.

Export('TESTS')
SConscript('SConscript', variant_dir=BUILD_DIR, src_dir='.', duplicate=0)

# Targets that run code.

for test in TESTS:
    filename = 'test_' + test
    binpath = os.path.join(BUILD_DIR, filename)
    Command(test, binpath, binpath)
    AlwaysBuild(test)

# Targets that format code.

additions = ['include/heman.h'] + Glob('test/*.c')
exclusions = Glob('src/noise.*')
cfiles = Glob('src/*.c') + Glob('src/*.h') + additions
cfiles = list(set(cfiles) - set(exclusions))
Command('format', cfiles, 'clang-format-3.6 -i $SOURCES && ' +
        'uncrustify -c uncrustify.cfg --no-backup $SOURCES')
AlwaysBuild('format')

# Targets that generate documentation.

Command('docs', Glob('docs/*.rst'), 'cd docs ; rm -rf _build ; make html')
AlwaysBuild('docs')
