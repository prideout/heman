// Copyright (c) 2012 Leonhard Gruenschloss (leonhard@gruenschloss.org)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

#include <fstream>
#include <iostream>
#include <cassert>
#include <cstdlib>

// An implementation of the small linear feedback shift registers (LFSR) for
// use in a Markov chain quasi-Monte Carlo context, as described in S. Chen,
// M. Matsumoto, T. Nishimura, and A. Owen: "New inputs and methods for Markov
// chain quasi-Monte Carlo", and S. Chen: "Consistence and convergence rate of
// Markov chain quasi-Monte Carlo with examples".
// Apart from the matrix that describes the recurrence, this class is stateless,
// and can therefore be easily shared in a multi-threaded context.
class Mcqmclfsr // Markov chain quasi-Monte Carlo linear feedback shift register.
{
public:
    enum Offset_type
    {
        ORIGINAL, // The original ones from the paper.
        GOOD_PROJECTIONS // Maximized minimum distance for some projections.
    };

    // Construct a small LFSR with period 2^m - 1, for 3 <= m <= 32.
    // The offset_type describes which set of offset values to use.
    explicit Mcqmclfsr(unsigned m, Offset_type offset_type);

    // Update the given state, and return the next value in the sequence,
    // using the scramble value as a random bit shift. For the first invocation
    // an arbitrary state value 0 < *state < 2^m may be used. The scramble parameter
    // may be an arbitrary (possibly random) value. To generate the scrambled
    // coordinates of the origin it is valid to pass *state == 0, but in this case
    // the state will not be updated.
    float next(unsigned scramble, unsigned* state) const;

private:
    const unsigned m_m; // period 2^m - 1
    unsigned m_f[32]; // f_d^s
};

Mcqmclfsr::Mcqmclfsr(const unsigned m, const Mcqmclfsr::Offset_type offset_type)
: m_m(m)
{
    assert(3 <= m && m <= 32);

    // Table taken from T. Hansen and G. Mullen:
    // "Primitive Polynomials over Finite Fields".
    // It is implied that the coefficient for t^m is 1.
    const unsigned primitive_polynomials[32 - 3 + 1] =
    {
        (1 << 1) | 1,                       // 3
        (1 << 1) | 1,                       // 4
        (1 << 2) | 1,                       // 5
        (1 << 1) | 1,                       // 6
        (1 << 1) | 1,                       // 7
        (1 << 4) | (1 << 3) | (1 << 2) | 1, // 8
        (1 << 4) | 1,                       // 9
        (1 << 3) | 1,                       // 10
        (1 << 2) | 1,                       // 11
        (1 << 6) | (1 << 4) | (1 << 1) | 1, // 12
        (1 << 4) | (1 << 3) | (1 << 1) | 1, // 13
        (1 << 5) | (1 << 3) | (1 << 1) | 1, // 14
        (1 << 1) | 1,                       // 15
        (1 << 5) | (1 << 3) | (1 << 2) | 1, // 16
        (1 << 3) | 1,                       // 17
        (1 << 7) | 1,                       // 18
        (1 << 5) | (1 << 2) | (1 << 1) | 1, // 19
        (1 << 3) | 1,                       // 20
        (1 << 2) | 1,                       // 21
        (1 << 1) | 1,                       // 22
        (1 << 5) | 1,                       // 23
        (1 << 4) | (1 << 3) | (1 << 1) | 1, // 24
        (1 << 3) | 1,                       // 25
        (1 << 6) | (1 << 2) | (1 << 1) | 1, // 26
        (1 << 5) | (1 << 2) | (1 << 1) | 1, // 27
        (1 << 3) | 1,                       // 28
        (1 << 2) | 1,                       // 29
        (1 << 6) | (1 << 4) | (1 << 1) | 1, // 30
        (1 << 3) | 1,                       // 31
        (1 << 7) | (1 << 6) | (1 << 2) | 1  // 32
    };

    // The original offsets 10 <= m <= 32 are taken from S. Chen, M. Matsumoto, T. Nishimura,
    // and A. Owen: "New inputs and methods for Markov chain quasi-Monte Carlo".
    // The alternative set of offsets for 3 <= m <= 16 was computed by Leonhard Gruenschloss.
    // They should also yield maximal equidistribution as described in P. L'Ecuyer: "Maximally
    // Equidistributed Combined Tausworthe Generators", but their projections might have better
    // maximized minimum distance properties.
    const unsigned offsets[32 - 3 + 1][2] =
    {
        // org / good proj.
        { 1,    1     }, // 3
        { 2,    2     }, // 4
        { 15,   15    }, // 5
        { 8,    8     }, // 6
        { 4,    4     }, // 7
        { 41,   41    }, // 8
        { 113,  113   }, // 9
        { 115,  226   }, // 10 *
        { 291,  520   }, // 11 *
        { 172,  1583  }, // 12 *
        { 267,  2242  }, // 13 *
        { 332,  2312  }, // 14 *
        { 388,  38    }, // 15 *
        { 283,  13981 }, // 16 *
        { 514,  514   }, // 17
        { 698,  698   }, // 18
        { 706,  706   }, // 19
        { 1304, 1304  }, // 20
        { 920,  920   }, // 21
        { 1336, 1336  }, // 22
        { 1236, 1236  }, // 23
        { 1511, 1511  }, // 24
        { 1445, 1445  }, // 25
        { 1906, 1906  }, // 26
        { 1875, 1875  }, // 27
        { 2573, 2573  }, // 28
        { 2633, 2633  }, // 29
        { 2423, 2423  }, // 30
        { 3573, 3573  }, // 31
        { 3632, 3632  }  // 32
    };

    // Construct the matrix that corresponds to a single transition.
    unsigned matrix[32];
    matrix[m - 1] = 0;
    for (unsigned i = 1, pp = primitive_polynomials[m - 3]; i < m; ++i, pp >>= 1)
    {
        matrix[m - 1] |= (pp & 1) << (m - i); // Reverse bits.
        matrix[i - 1] = 1 << (m - i - 1);
    }

    // Apply the matrix exponentiation according to the offset.
    unsigned result0[32], result1[32]; // Storage for temporary results.
    for (unsigned i = 0; i < m; ++i)
        result0[i] = matrix[i]; // Copy over row.
    unsigned* in = result0;
    unsigned* out = result1;
    const unsigned offset = offsets[m - 3][static_cast<int>(offset_type)];
    for (unsigned i = 1; i < offset; ++i)
    {
        // Perform matrix multiplication: out = in * matrix.
        for (unsigned y = 0; y < m; ++y)
        {
            out[y] = 0;
            for (unsigned x = 0; x < m; ++x)
                for (unsigned i = 0; i < m; ++i)
                    out[y] ^= (((in[y] >> i) & (matrix[m - i - 1] >> x)) & 1) << x;
        }

        // Swap input and output.
        unsigned* tmp = in;
        in = out;
        out = tmp;
    }

    // Transpose the result for simpler multiplication.
    for (unsigned y = 0; y < m; ++y)
    {
        m_f[y] = 0;
        for (unsigned x = 0; x < m; ++x)
            m_f[y] |= ((in[x] >> y) & 1) << (m - x - 1);
    }
}

inline float Mcqmclfsr::next(const unsigned scramble, unsigned* const state) const
{
    assert(state);

    // Compute the matrix-vector multiplication using one matrix column at a time.
    unsigned result = 0;
    for (unsigned i = 0, s = *state; s; ++i, s >>= 1)
        if (s & 1)
            result ^= m_f[i];

    assert(result <= ~-(1u << m_m));
    *state = result; // Write result back.
    result = (result << (32 - m_m)) ^ scramble; // Apply scrambling.
    return result * (1.f / (1ULL << 32)); // Map to [0, 1).
}

// Print some 2D plots to a file that can e.g. be displayed by gnuplot.
// Note that in particular for 2D points we have gcd(n, 2) = 1, so we
// don't need padding in the variate matrix.
// Returns true on success, false otherwise.
bool plot2d(const unsigned m, const unsigned scramble, const char* const filename)
{
    const unsigned n = (1 << m) - 1; // 2^m - 1, period of the LFSR
    const Mcqmclfsr lfsr(m, Mcqmclfsr::GOOD_PROJECTIONS);

    std::ofstream out(filename);
    if (!out)
        return false;

    // Compute the scrambled origin.
    unsigned state = 0;
    const float org = lfsr.next(scramble, &state);
    out << org << " " << org << std::endl;

    // Compute the remaining points.
    state = 1 << (m - 1); // Arbitrary, but > 0, corresponds to b_0 = 1.
    for (unsigned i = 0; i < n; ++i)
    {
        const float x = lfsr.next(scramble, &state);
        const float y = lfsr.next(scramble, &state);
        out << x << " " << y << std::endl;
    }
    out.close();

    return true;
}

int main(int argc, char** argv)
{
    // Handle passing the period exponent as a parameter.
    const unsigned m = (argc == 2) ? atoi(argv[1]) : 10;
    if (m < 3)
    {
        std::cerr << "Error parsing exponent, must be >= 3." << std::endl;
        return 1;
    }

    // Plot points without scrambling.
    if (!plot2d(m, 0, "out.dat"))
    {
        std::cerr << "Error writing to plot file." << std::endl;
        return 2;
    }

    // Plot points with scrambling.
    if (!plot2d(m, 0x05071984, "scramble.dat"))
    {
        std::cerr << "Error writing to plot file." << std::endl;
        return 3;
    }

    return 0;
}

