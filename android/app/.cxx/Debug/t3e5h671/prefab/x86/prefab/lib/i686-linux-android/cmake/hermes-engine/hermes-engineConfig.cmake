if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/Krly/.gradle/caches/8.8/transforms/9a985facbf22f2425b6400ce6f0ffac9/transformed/hermes-android-0.75.3-debug/prefab/modules/libhermes/libs/android.x86/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Krly/.gradle/caches/8.8/transforms/9a985facbf22f2425b6400ce6f0ffac9/transformed/hermes-android-0.75.3-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

