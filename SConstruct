BUILD_DIR = 'build'


def add_test(target, filename):
    import os.path
    binpath = os.path.join(BUILD_DIR, filename)
    Command(target, binpath, binpath)
    AlwaysBuild(target)

AddOption('--double',
          dest='double',
          action='store_true',
          help='use 64-bit floats')

# Building Targets

SConscript('SConscript', variant_dir=BUILD_DIR, src_dir='.', duplicate=0)

# Executing Tests

add_test('test', 'test_heman')
add_test('earth', 'test_earth')
add_test('sdf',  'test_sdf')

# Code Formatting

additions = ['include/heman.h'] + Glob('test/*.c')
exclusions = Glob('src/noise.*')
cfiles = Glob('src/*.c') + Glob('src/*.h') + additions
cfiles = list(set(cfiles) - set(exclusions))
Command('format', cfiles, 'clang-format-3.6 -i $SOURCES && ' +
        'uncrustify -c uncrustify.cfg --no-backup $SOURCES')
AlwaysBuild('format')

# Sphinx Docs

Command('docs', Glob('docs/*.rst'), 'cd docs ; rm -rf _build ; make html')
AlwaysBuild('docs')
